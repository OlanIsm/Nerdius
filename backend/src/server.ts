import { app } from "./app.ts";

for (const name of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
  if (!process.env[name]) throw new Error(`${name} is required. Fill backend/.env before starting the API.`);
}
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Nerdungeon API listening on http://localhost:${port}`)).on("error", (error) => {
  console.error(`Cannot start Nerdungeon API on port ${port}: ${error.message}`);
  process.exit(1);
});
