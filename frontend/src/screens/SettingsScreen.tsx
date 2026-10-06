import { useEffect, useRef, useState } from "react";
import { art } from "../assets";
import { Button, Icon } from "../components/GameUI";
import { usePreference } from "../modules/settings/preferences";
import { readAccount, type Account } from "../modules/account/api";
import "../settings.css";

type Section = "Profile" | "Preference" | "Plan" | "Account";
const plans = [
  { name: "Free", price: "Rp0" },
  { name: "Traveler", price: "Rp35.000" },
  { name: "Master", price: "Rp80.000" },
] as const;

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [section, setSection] = useState<Section>();
  const [displayName] = usePreference("nerdungeon.displayName", "Nerd Mage");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [section]);
  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <header className="settings-heading">
        <button type="button" className="settings-back" aria-label={section ? "Back to settings" : "Back"} onClick={() => section ? setSection(undefined) : onBack()}>
          <Icon name="arrow-left" size={23} color="currentColor" />
        </button>
        <h1 id="settings-title" ref={heading} tabIndex={-1}>{section ?? "Settings"}</h1>
      </header>
      {!section && <div className="settings-bento">
        <button type="button" className="settings-tile settings-profile" aria-label="Profile" onClick={() => setSection("Profile")}>
          <img src={art.character} alt="" />
          <span><strong>Profile</strong><span>{displayName}</span></span>
          <Icon name="chevron-right" size={22} color="currentColor" />
        </button>
        <button type="button" className="settings-tile settings-preference" aria-label="Preference" onClick={() => setSection("Preference")}>
          <Icon name="tune-variant" size={30} color="currentColor" /><strong>Preference</strong>
        </button>
        <button type="button" className="settings-tile settings-account" aria-label="Account" onClick={() => setSection("Account")}>
          <Icon name="shield-outline" size={30} color="currentColor" /><strong>Account</strong>
        </button>
        <button type="button" className="settings-tile settings-plan" aria-label="Plan" onClick={() => setSection("Plan")}>
          <span className="settings-plan-title"><Icon name="star-four-points" size={28} color="currentColor" /><strong>Plan</strong><Icon name="chevron-right" size={22} color="currentColor" /></span>
          <span className="settings-plan-names">Free <span>Traveler</span> <span>Master</span></span>
        </button>
      </div>}
      {section === "Profile" && <ProfileSettings />}
      {section === "Preference" && <PreferenceSettings />}
      {section === "Plan" && <div className="settings-plans">
        {plans.map((plan) => <article key={plan.name} className={`settings-plan-option ${plan.name.toLowerCase()}`} aria-label={`${plan.name} plan`}>
          <div className="settings-plan-option-heading"><h2>{plan.name}</h2>{plan.name === "Free" && <span className="settings-current">Current</span>}</div>
          <p className="settings-price">{plan.price}<span>/ bulan</span></p>
          {plan.name !== "Free" && <button type="button" className="settings-upgrade" disabled>Coming soon</button>}
        </article>)}
        <p className="settings-note">Paid plans are not available yet.</p>
      </div>}
      {section === "Account" && <AccountSettings />}
    </section>
  );
}

function ProfileSettings() {
  const [displayName, saveName] = usePreference("nerdungeon.displayName", "Nerd Mage");
  const [draft, setDraft] = useState(displayName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  return <form className="settings-panel settings-profile-form" onSubmit={(event) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name || name.length > 32) { setError("Use 1–32 characters."); return; }
    try { saveName(name); setDraft(name); setSaved(true); setError(undefined); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save profile."); }
  }}>
    <img src={art.character} className="settings-avatar" alt="Nerd Mage" />
    <label htmlFor="display-name">Display name</label>
    <input id="display-name" name="displayName" value={draft} maxLength={32} required autoComplete="nickname" aria-describedby="profile-save-status" onChange={(event) => { setDraft(event.target.value); setSaved(false); setError(undefined); }} />
    <button type="submit" className="settings-save">Save</button>
    <p id="profile-save-status" role={error ? "alert" : "status"} className={error ? "settings-error" : "settings-note"}>{error ?? (saved ? "Saved" : "Saved on this device.")}</p>
  </form>;
}

function PreferenceSettings() {
  const [sound, saveSound] = usePreference("nerdungeon.summonSound", "on");
  const [motion, saveMotion] = usePreference("nerdungeon.reduceMotion", "off");
  const [error, setError] = useState<string>();
  function update(save: (value: string) => void, enabled: boolean) {
    try { save(enabled ? "on" : "off"); setError(undefined); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save preference."); }
  }
  return <div className="settings-panel settings-preferences">
    <label className="settings-switch-row"><span><strong>Summon sound</strong></span><input type="checkbox" role="switch" checked={sound !== "off"} onChange={(event) => update(saveSound, event.target.checked)} /></label>
    <label className="settings-switch-row"><span><strong>Reduce motion</strong><small>Also follows your device setting.</small></span><input type="checkbox" role="switch" checked={motion === "on"} onChange={(event) => update(saveMotion, event.target.checked)} /></label>
    {error && <p role="alert" className="settings-error">{error}</p>}
  </div>;
}

function AccountSettings() {
  const [account, setAccount] = useState<Account>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    readAccount().then((data) => { if (active) setAccount(data); }).catch((failure) => {
      if (active) setError(failure instanceof Error ? failure.message : "Could not load account.");
    });
    return () => { active = false; };
  }, [attempt]);
  return <div className="settings-panel settings-account-detail" aria-busy={!account && !error}>
    {error ? <><p role="alert" className="settings-error">{error}</p><Button label="Retry" onPress={() => { setError(undefined); setAttempt((value) => value + 1); }} /></> : account ? <>
      <Icon name="shield-outline" size={36} color="currentColor" />
      <h2>{account.email ? "Linked account" : "Guest account"}</h2>
      {account.email && <p className="settings-email">{account.email}</p>}
      <label htmlFor="account-id">Account ID</label><input id="account-id" value={account.id} readOnly />
      {!account.email && <p className="settings-note">Keep your browser data to keep your progress. Account recovery is not available yet.</p>}
    </> : <p role="status">Loading account…</p>}
  </div>;
}
