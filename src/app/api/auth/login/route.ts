import authApiRequest from '@/apiRequest/auth'
import { LoginBodyType } from '@/schemaValidations/auth.schema'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { HttpError } from '@/lib/http'

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBodyType
  const cookieStore = await cookies()

  try {
    const { payload } = await authApiRequest.serverLogin(body)
    console.log('cookieStore: ', cookieStore)
    const { accessToken, refreshToken } = payload.data
    const decodeAccessToken = jwt.decode(accessToken) as { exp: number }
    const decodeRefreshToken = jwt.decode(refreshToken) as { exp: number }
    cookieStore.set('accessToken', accessToken, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      expires: decodeAccessToken.exp * 1000
    })
    cookieStore.set('refreshToken', refreshToken, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      expires: decodeRefreshToken.exp * 1000
    })
    return Response.json(payload)
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json(error.payload, {
        status: error.status
      })
    }
    return Response.json(
      {
        message: 'Đã có lỗi xảy ra'
      },
      {
        status: 500
      }
    )
  }
}
