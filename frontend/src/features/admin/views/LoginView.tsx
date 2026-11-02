"use client";

import { useState } from "react";

import { Icon } from "../components/Icon";
import { RequiredFieldMark } from "../components/RequiredFieldMark";
import type { EmployeeLoginData } from "../api/authApi";
import { useLoginViewModel } from "../viewmodels/loginViewModel";
import { ForgotPasswordView } from "./ForgotPasswordView";

export function LoginView({ onSignIn }: { onSignIn: (session: EmployeeLoginData) => void }) {
  const vm = useLoginViewModel(onSignIn);
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <main className="login-screen">
      <section className="login-story">
        <div className="brand login-brand">
          <span className="brand-mark"><img src="/login/logo.png" alt="Train Dabba" width={82} height={77} /></span>
          <span className="brand-copy"><strong>Train Dabba</strong><small>Super admin portal</small></span>
        </div>

        <div className="login-story__pattern pattern-one" />
        <div className="login-story__pattern pattern-two" />
        <div className="login-story__dots" aria-hidden="true" />

        <div className="login-story__content">
          <span className="eyebrow eyebrow--light">
            TRAIN DABBA · ADMIN PORTAL
          </span>

          <h1>Powering a smoother <span>food journey</span></h1>

          <p>
            Manage orders, users, restaurants and more —<br />
            all from one place.
          </p>

          <div className="login-features">
            <div><Icon name="receipt" size={30} /><span><strong>Orders</strong><small>Track &amp; manage</small></span></div>
            <div><Icon name="users" size={30} /><span><strong>Users</strong><small>Control access</small></span></div>
            <div><Icon name="store" size={30} /><span><strong>Restaurants</strong><small>Monitor operations</small></span></div>
            <div><Icon name="wallet" size={30} /><span><strong>Payments</strong><small>Handle transactions</small></span></div>
          </div>
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-card">
          <div className="login-mobile-brand">
            <div className="brand login-brand">
              <span className="brand-mark"><img src="/login/logo.png" alt="Train Dabba" width={82} height={77} /></span>
              <span className="brand-copy"><strong>Train Dabba</strong><small>Super admin portal</small></span>
            </div>
          </div>

          {forgotOpen ? (
            <ForgotPasswordView
              initialEmail={vm.email}
              onBackToSignIn={() => setForgotOpen(false)}
            />
          ) : (
          <>
          <span className="eyebrow">WELCOME BACK</span>

          <h2>Sign in to your account</h2>

          <p className="login-subtitle">
            Use your registered email and password to continue.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void vm.submit();
            }}
          >
            <label className="field-label">
              <span>Email address<RequiredFieldMark /></span>

              <span className="input-wrap">
                <Icon name="mail" size={20} />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  name="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={vm.email}
                  onChange={(event) => vm.setEmail(event.target.value)}
                  required
                  autoComplete="username"
                  disabled={vm.isSubmitting}
                />

              </span>
            </label>

            <label className="field-label">
              <span>Password<RequiredFieldMark /></span>

              <span className="input-wrap">
                <Icon name="lock" size={20} />
                <input
                  type={vm.passwordVisible ? "text" : "password"}
                  placeholder="Enter your password"
                  name="password"
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
                <span>Remember my email</span>
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
                  : "Sign in"}
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
