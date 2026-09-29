"use client";

import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { useLoginViewModel } from "../viewmodels/loginViewModel";

export function LoginView({ onSignIn }: { onSignIn: () => void }) {
  const vm = useLoginViewModel(onSignIn);

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
              <strong>12.8K</strong>
              <span>Happy customers</span>
            </div>

            <div>
              <strong>48</strong>
              <span>Resturants</span>
            </div>

            <div>
              <strong>98.2%</strong>
              <span>Order success</span>
            </div>
          </div>
        </div>

        <div className="story-footer">
          <span className="story-pulse" />
          Live platform monitoring
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-card">
          <div className="login-mobile-brand">
            <Brand compact />
          </div>

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
                  value={vm.email}
                  onChange={(event) => vm.setEmail(event.target.value)}
                  required
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
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>

              <button type="button" className="text-button">
                Forgot password?
              </button>
            </div>

            {vm.errorMessage && (
              <div className="api-state api-state--error">
                {vm.errorMessage}
              </div>
            )}

            <button
              className="primary-button primary-button--full"
              type="submit"
              disabled={vm.isSubmitting}
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

          <p className="login-secure">
            <Icon name="shield" size={14} />
            Secure, admin-level access
          </p>
        </div>
      </section>
    </main>
  );
}