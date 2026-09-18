import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '15.207.247.65'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const origin = protocol + '://' + host
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(origin + '/dashboard')
    }
  }

  return NextResponse.redirect(origin + '/login?error=auth_failed')
}
