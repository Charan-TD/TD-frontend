"use client";

import { useState } from "react";

import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import type { EmployeeLoginData } from "../api/authApi";
import { useLoginViewModel } from "../viewmodels/loginViewModel";
import { ForgotPasswordView } from "./ForgotPasswordView";

export function LoginView({ onSignIn }: { onSignIn: (session: EmployeeLoginData) => void }) {
  const vm = useLoginViewModel(onSignIn);
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <main className="login-screen">
      <section className="login-story">
        <Brand light />

        <div className="login-story__pattern pattern-one" />
        <div className="login-story__pattern pattern-two" />

        <div className="login-story__content">
          <span className="eyebrow eyebrow--light">
            TRAIN DABBA · CONTROL CENTRE
          </span>

          <h1>Every journey deserves a well-run kitchen.</h1>

          <p>
            One calm workspace for the people, meals and operations behind
            every Train Dabba order.
          </p>

          <div className="story-stats">
            <div>
              <strong>—</strong>
              <span>Happy customers</span>
            </div>

            <div>
              <strong>—</strong>
              <span>Restaurants</span>
            </div>

            <div>
              <strong>—</strong>
              <span>Order success</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-card">
          <div className="login-mobile-brand">
            <Brand compact />
          </div>

          {forgotOpen ? (
            <ForgotPasswordView
              initialEmail={vm.email}
              onBackToSignIn={() => setForgotOpen(false)}
            />
          ) : (
          <>
          <span className="eyebrow">WELCOME BACK</span>

          <h2>Sign in to admin</h2>

          <p className="login-subtitle">
            Enter your details to manage the Train Dabba platform.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void vm.submit();
            }}
          >
            <label className="field-label">
              Email address

              <span className="input-wrap">
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={vm.email}
                  onChange={(event) => vm.setEmail(event.target.value)}
                  required
                  autoComplete="username"
                  disabled={vm.isSubmitting}
                />

                <Icon name="users" size={16} />
              </span>
            </label>

            <label className="field-label">
              Password

              <span className="input-wrap">
                <input
                  type={vm.passwordVisible ? "text" : "password"}
                  placeholder="Enter your password"
                  value={vm.password}
                  onChange={(event) => vm.setPassword(event.target.value)}
                  required
                  disabled={vm.isSubmitting}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  aria-label={
                    vm.passwordVisible
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={vm.togglePasswordVisibility}
                  disabled={vm.isSubmitting}
                  data-tooltip={vm.isSubmitting ? "Please wait, signing in" : undefined}
                >
                  <Icon
                    name={vm.passwordVisible ? "eye-off" : "eye"}
                    size={16}
                  />
                </button>
              </span>
            </label>

            <div className="login-options">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={vm.rememberMe}
                  onChange={(event) => vm.setRememberMe(event.target.checked)}
                  disabled={vm.isSubmitting}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="text-button"
                onClick={() => setForgotOpen(true)}
                disabled={vm.isSubmitting}
              >
                Forgot password?
              </button>
            </div>

            {vm.errorMessage && (
              <div className="api-state api-state--error" role="alert">
                {vm.errorMessage}
              </div>
            )}

            <button
              className="primary-button primary-button--full"
              type="submit"
              disabled={vm.isSubmitting}
              data-tooltip={vm.isSubmitting ? "Please wait, signing in" : undefined}
            >
              <span>
                {vm.isSubmitting
                  ? "Signing in..."
                  : "Continue to dashboard"}
              </span>

              {!vm.isSubmitting && (
                <Icon name="arrow-right" size={18} />
              )}
            </button>
          </form>
          </>
          )}

          <p className="login-secure">
            <Icon name="shield" size={14} />
            Secure, admin-level access
          </p>
        </div>
      </section>
    </main>
  );
}