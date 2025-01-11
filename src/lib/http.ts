import { normalizePath } from '@/lib/utils'
import { AccountResType } from '@/schemaValidations/account.schema'
import { LoginResType } from '@/schemaValidations/auth.schema'
import { redirect } from 'next/navigation'
import envConfig from '../../config'

// const promiseDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type CustomOptions = Omit<RequestInit, 'method'> & {
  baseUrl?: string | undefined
}

const ENTITY_ERROR_STATUS = 422
const AUTHENTICATION_ERROR_STATUS = 401

type EntityErrorPayload = {
  message: string
  errors: {
    field: string
    message: string
  }[]
}

export class HttpError extends Error {
  status: number
  payload: {
    message: string
    [key: string]: any
  }
  constructor({ status, payload, message = 'Lỗi HTTP' }: { status: number; payload: any; message?: string }) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export class EntityError extends HttpError {
  status: typeof ENTITY_ERROR_STATUS
  payload: EntityErrorPayload
  constructor({ status, payload }: { status: typeof ENTITY_ERROR_STATUS; payload: EntityErrorPayload }) {
    // super('Http Error')
    super({ status, payload, message: 'Lỗi thực thể' })
    if (status !== ENTITY_ERROR_STATUS) {
      throw new Error('Entity Errro mus bave status 422')
    }
    this.status = status
    this.payload = payload
  }
}

class UserInfo {
  private _info: AccountResType['data'] | undefined = undefined
  get info() {
    return this._info as AccountResType['data']
  }
  set info(info: AccountResType['data'] | undefined) {
    this._info = info
  }
}

// export const clientSessionToken = new SessionToken();

export const clientUserInfo = new UserInfo()

const isClient = typeof window !== 'undefined'

let clientLogoutRequest: null | Promise<any> = null

const request = async <Response>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  options?: CustomOptions | undefined
) => {
  let body: FormData | string | undefined = undefined
  if (options?.body instanceof FormData) {
    body = options.body
  } else if (options?.body) {
    body = JSON.stringify(options.body)
  }
  const baseHeaders: {
    [key: string]: string
  } =
    body instanceof FormData
      ? {}
      : {
          'Content-Type': 'application/json'
        }
  if (isClient) {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      baseHeaders.Authorization = `Bearer ${accessToken}`
    }
  }

  // Nếu trong trường hợp api truyền baseUrl là rỗng thì sẽ lấy url gọi đến API của Next.js Server
  const baseUrl = options?.baseUrl === undefined ? envConfig.NEXT_PUBLIC_API_ENDPOINT : options.baseUrl

  //   const fullUrl = url.startsWith("/") ? `${baseUrl}${url}` : `${baseUrl}/${url}`
  const fullUrl = `${baseUrl}/${normalizePath(url)}`
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      ...baseHeaders,
      ...options?.headers
    },
    body,
    method
  })

  const payload: Response = await res.json()
  const data = {
    status: res.status,
    payload
  }
  if (!res.ok) {
    // throw new HttpError(data)
    if (res.status === ENTITY_ERROR_STATUS) {
      throw new EntityError(
        data as {
          status: 422
          payload: EntityErrorPayload
        }
      )
    } else if (res.status === AUTHENTICATION_ERROR_STATUS) {
      if (isClient) {
        if (!clientLogoutRequest) {
          clientLogoutRequest = fetch('/api/auth/logout', {
            method: 'POST',
            body: null, //Logout sẽ cho phép luôn luôn thành công
            headers: {
              ...baseHeaders
            }
          })
          try {
            await clientLogoutRequest
          } catch (error) {
            console.error(error)
          } finally {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            // clientSessionToken.value = "";
            // clientSessionToken.expiresAt = new Date().toISOString();
            clientLogoutRequest = null
            // Redirect về trang login có thể dẫn đến trường hợp loop vô hạn nếu không được xử lý đúng cách
            // Vì nếu rơi vào trường hợp tại trang login, chúng ta có gọi các API cần access token
            // Mà access token đã bị xoá thì nó lại bị nhảy vào đây, và cứ thế nó sẽ bị lặp vô hạn
            window.location.href = '/login'
          }
        }
      } else {
        const accessToken = (options?.headers as any)?.Authorization?.split(' ')?.[1]
        redirect(`/logout?accessToken=${accessToken}`)
      }
    } else {
      throw new HttpError(data)
    }
  }
  // Đảm bảo logic này chỉ chạy ở bên phía client
  if (isClient) {
    const normalizeUrl = normalizePath(url)
    if (normalizeUrl === 'api/auth/login') {
      const { accessToken, refreshToken } = (payload as LoginResType).data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    } else if (normalizeUrl === 'api/auth/logout') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }
  return data
}

const http = {
  get<Response>(url: string, options?: Omit<CustomOptions, 'body'> | undefined) {
    return request<Response>('GET', url, options)
  },
  post<Response>(url: string, body: any, options?: Omit<CustomOptions, 'body'> | undefined) {
    return request<Response>('POST', url, { ...options, body })
  },
  put<Response>(url: string, body: any, options?: Omit<CustomOptions, 'body'> | undefined) {
    return request<Response>('PUT', url, { ...options, body })
  },
  delete<Response>(url: string, options?: Omit<CustomOptions, 'body'> | undefined) {
    return request<Response>('DELETE', url, { ...options })
  }
}

export default http
