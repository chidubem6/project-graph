'use client'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

import { GitHubIcon, GoogleIcon } from './social-icons'

// Markup only for now — signIn.sso() is wired in a follow-up. The buttons are
// deliberately inert rather than absent so the layout lands before the flow.
export function SocialSignIn() {
  return (
    <>
      <Field>
        <Button variant="outline" size="lg" type="button" className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>
      </Field>

      <Field>
        <Button variant="outline" size="lg" type="button" className="w-full">
          <GitHubIcon />
          Continue with GitHub
        </Button>
      </Field>
    </>
  )
}
