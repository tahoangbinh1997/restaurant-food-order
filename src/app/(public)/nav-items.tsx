'use client'

import Link from 'next/link'
import React from 'react'

const menuItems = [
  {
    title: 'Món ăn',
    href: '/mon-an'
  },
  {
    title: 'Đơn hàng',
    href: '/orders'
  },
  {
    title: 'Đăng nhập',
    href: '/login',
    authRequired: false
  },
  {
    title: 'Quản lý',
    href: '/manage/dashboard',
    authRequired: true
  }
]

export default function NavItems({ className }: { className?: string }) {
  return menuItems.map((item) => (
    <Link href={item.href} key={item.href} className={className}>
      {item.title}
    </Link>
  ))
}
