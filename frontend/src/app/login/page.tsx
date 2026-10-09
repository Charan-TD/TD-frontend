import { App } from "../../features/admin/App";

// The portal shows its sign-in screen on "/" when signed out; /login serves
// the same page so bookmarks and typed /login URLs don't 404.
export default function LoginPage() {
  return <App />;
}
