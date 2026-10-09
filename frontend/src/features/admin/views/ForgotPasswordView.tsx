"use client";

import { Icon } from "../components/Icon";
import { useForgotPasswordViewModel } from "../viewmodels/forgotPasswordViewModel";

type Props = {
  initialEmail: string;
  onBackToSignIn: () => void;
};

export function ForgotPasswordView({ initialEmail, onBackToSignIn }: Props) {
  const vm = useForgotPasswordViewModel(initialEmail);

  return (
    <>
      <span className="eyebrow">FORGOT PASSWORD</span>
      <h2>Reset your password</h2>
      <p className="login-subtitle">
        Enter your email and we’ll send you instructions to reset your password.
      </p>

      {vm.sentMessage ? (
        <>
          <div className="api-state api-state--success" role="status">{vm.sentMessage}</div>
          <button className="primary-button primary-button--full" type="button" onClick={onBackToSignIn}>
            <span>Back to sign in</span>
            <Icon name="arrow-right" size={18} />
          </button>
        </>
      ) : (
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
                autoComplete="email"
                disabled={vm.isSubmitting}
              />
              <Icon name="users" size={16} />
            </span>
          </label>

          {vm.errorMessage && <div className="api-state api-state--error" role="alert">{vm.errorMessage}</div>}

          <button className="primary-button primary-button--full" type="submit" disabled={vm.isSubmitting}>
            <span>{vm.isSubmitting ? "Sending..." : "Send reset email"}</span>
            {!vm.isSubmitting && <Icon name="arrow-right" size={18} />}
          </button>

          <div className="login-options login-options--center">
            <button type="button" className="text-button" onClick={onBackToSignIn} disabled={vm.isSubmitting}>
              Back to sign in
            </button>
          </div>
        </form>
      )}
    </>
  );
}
