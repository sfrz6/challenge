import { loginAction } from "@/app/actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const hasError = params?.error === "missing";

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Before you start</h1>
        <p>
          Your name goes on the leaderboard. The phone number just keeps your
          run linked to you if you get interrupted.
        </p>
        <form action={loginAction}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              autoComplete="off"
              autoCapitalize="words"
              maxLength={60}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="9xxxxxxx"
              autoComplete="off"
              maxLength={20}
              required
            />
          </div>
          {hasError && (
            <p className="form-error">
              Enter your name and phone number to start.
            </p>
          )}
          <button className="btn-primary" type="submit">
            Start the clock
          </button>
        </form>
        <div className="login-foot">
          Timer starts when the first challenge loads.
        </div>
      </div>
    </div>
  );
}
