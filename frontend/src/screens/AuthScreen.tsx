import { useEffect, useState, type FormEvent } from "react";
import { art } from "../assets";
import { playAuthTextBoxSound, setAuthMusic } from "../components/gameAudio";
import { getSupabaseClient } from "../gameApi";

type Mode = "login" | "signup";

export function AuthScreen({
  initialError,
  onAuthenticated,
}: {
  initialError?: string;
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [focusedField, setFocusedField] = useState<string>();

  useEffect(() => {
    setAuthMusic(true);
    return () => setAuthMusic(false);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setNotice(undefined);

    if (mode === "signup") {
      if (name.trim().length < 2 || name.trim().length > 32) {
        setError("Choose a character name between 2 and 32 characters.");
        return;
      }
      if (password.length < 8) {
        setError("Use a password with at least 8 characters.");
        return;
      }
      if (password !== confirmation) {
        setError("Those passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      const auth = getSupabaseClient().auth;
      if (mode === "login") {
        const { error: authError } = await auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        onAuthenticated();
      } else {
        const {
          data: { session },
          error: sessionError,
        } = await auth.getSession();
        if (sessionError) throw sessionError;
        if (session?.user.is_anonymous) {
          const { data, error: upgradeError } = await auth.updateUser({
            email: email.trim(),
            password,
            data: { display_name: name.trim() },
          });
          if (upgradeError) throw upgradeError;
          if (!data.user.is_anonymous) {
            onAuthenticated();
          } else {
            setNotice(
              "Check your email to finish creating your account. Your guest progress will be kept.",
            );
            setMode("login");
          }
        } else {
          const { data, error: authError } = await auth.signUp({
            email: email.trim(),
            password,
            options: { data: { display_name: name.trim() } },
          });
          if (authError) throw authError;
          if (data.session) {
            onAuthenticated();
          } else {
            setNotice(
              "Check your email to confirm your account, then come back to log in.",
            );
            setMode("login");
          }
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function playAsGuest() {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const { error: authError } =
        await getSupabaseClient().auth.signInAnonymously();
      if (authError) throw authError;
      onAuthenticated();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start a guest account.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="auth-page"
      aria-label="Nerdungeon account"
      onPointerDown={() => setAuthMusic(true)}
      onKeyDown={() => setAuthMusic(true)}
    >
      <div className="auth-art-stage" aria-hidden="true">
        <img className="auth-art-background" src={art.authBackground} alt="" />
        <img className="auth-art-title" src={art.authTitle} alt="" />
        <span
          className="auth-title-glisten"
          style={{
            maskImage: `url("${art.authTitle}")`,
            WebkitMaskImage: `url("${art.authTitle}")`,
          }}
        />
        <img
          className="auth-art-signs"
          src={mode === "login" ? art.loginSigns : art.signupSigns}
          alt=""
        />
      </div>
      <h1 className="visually-hidden">Nerdungeon</h1>
      <form
        className="auth-form"
        data-mode={mode}
        data-focused-field={focusedField}
        onSubmit={submit}
        noValidate
      >
        {mode === "signup" && (
          <label
            className="auth-field auth-field--name"
            onFocus={() => {
              setFocusedField("name");
              playAuthTextBoxSound();
            }}
            onBlur={() => setFocusedField(undefined)}
          >
            <span className="visually-hidden">Character name</span>
            <input
              name="name"
              type="text"
              autoComplete="nickname"
              placeholder="Character name"
              maxLength={32}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
              required
            />
            {focusedField === "name" && (
              <img className="auth-focus-frill" src={art.authSelectedPlank} alt="" />
            )}
          </label>
        )}
        <label
          className="auth-field auth-field--email"
          onFocus={() => {
            setFocusedField("email");
            playAuthTextBoxSound();
          }}
          onBlur={() => setFocusedField(undefined)}
        >
          <span className="visually-hidden">Email address</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            required
          />
          {focusedField === "email" && (
            <img className="auth-focus-frill" src={art.authSelectedPlank} alt="" />
          )}
        </label>
        <label
          className="auth-field auth-field--password"
          onFocus={() => {
            setFocusedField("password");
            playAuthTextBoxSound();
          }}
          onBlur={() => setFocusedField(undefined)}
        >
          <span className="visually-hidden">Password</span>
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder="Password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            required
          />
          {focusedField === "password" && (
            <img className="auth-focus-frill" src={art.authSelectedPlank} alt="" />
          )}
        </label>
        {mode === "signup" && (
          <label
            className="auth-field auth-field--confirmation"
            onFocus={() => {
              setFocusedField("confirmation");
              playAuthTextBoxSound();
            }}
            onBlur={() => setFocusedField(undefined)}
          >
            <span className="visually-hidden">Confirm password</span>
            <input
              name="password-confirmation"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              minLength={8}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={busy}
              required
            />
            {focusedField === "confirmation" && (
              <img className="auth-focus-frill" src={art.authSelectedPlank} alt="" />
            )}
          </label>
        )}
        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <div
        className="auth-feedback"
        aria-live="polite"
        role={error ? "alert" : "status"}
      >
        {error ?? notice}
      </div>
      <div className="auth-links">
        <button
          className="auth-link"
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(undefined);
            setNotice(undefined);
          }}
          disabled={busy}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Log in"}
        </button>
        {mode === "login" && (
          <button
            className="auth-link"
            type="button"
            onClick={playAsGuest}
            disabled={busy}
          >
            Continue as guest
          </button>
        )}
      </div>
    </section>
  );
}
