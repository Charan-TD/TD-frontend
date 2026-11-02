"use client";

import { Icon } from "../components/Icon";
import { RequiredFieldMark } from "../components/RequiredFieldMark";
import { TransientSuccessMessage } from "../components/TransientSuccessMessage";
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
        <TransientSuccessMessage message={vm.sentMessage} className="api-state api-state--success" />
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
                autoComplete="email"
                disabled={vm.isSubmitting}
              />
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
