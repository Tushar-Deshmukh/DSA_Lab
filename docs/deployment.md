# Deploying to Vercel with MongoDB Atlas

For whoever holds the hosting accounts. Decision D-025 chose a free Vercel account (Hobby plan) and a free MongoDB Atlas cluster (M0). This page covers the first deployment. The full deployment guide arrives in Phase 8.

Production deploys from the `main` branch, so merge Phase 1 first: `main` does not contain the app before that.

## 1. MongoDB Atlas (free M0 cluster)

1. In Atlas, create a project, then a free **M0** cluster in the region closest to your learners.
2. **Database Access → Add New Database User.** Use password authentication and generate a strong password. Under "Specific Privileges", give the user `readWrite` on the database `dsa-pattern-lab` only.
3. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`). Vercel's servers have no fixed addresses; the strong password is what protects the database.
4. **Connect → Drivers** and copy the `mongodb+srv://…` string. Put the password into it, and add the database name before the `?`:

   ```
   mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/dsa-pattern-lab?retryWrites=true&w=majority
   ```

Paste this string only into Vercel (step 2). Never put it in chat, in a commit or in an issue: it contains the password.

## 2. Vercel

1. **Add New → Project → Import Git Repository**, and pick `Tushar-Deshmukh/DSA_Lab`. Vercel asks to install its GitHub app; allow it for this repository.
2. **Build settings.**
   - The framework is detected as Next.js.
   - The build command comes from `vercel.json` (`npm run build`). That runs `next build` and then adds each page's script hashes; without that step, pages fall back to a weaker policy.
   - The Node.js version comes from `package.json` (24).
3. **Environment variables**, for Production:

   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | the Atlas string from step 1 |
   | `BETTER_AUTH_SECRET` | the output of `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` |
   | `BETTER_AUTH_URL` | the production address Vercel shows for the project, for example `https://dsa-lab.vercel.app` |
   | `EMAIL_TRANSPORT` | `none`, until an email provider is chosen |

   If the address is not known before the first deployment, deploy, set `BETTER_AUTH_URL`, then redeploy.
4. **Deploy.**

## 3. After the first deployment

- Open `https://<your-address>/api/health`. It should show `{"ok":true,"db":"up"}`.
- Send the address to Claude, to run the browser checks against the live site: script policy, hydration and guest mode.
- What a visitor will see:
  - Sign-in says "not set up yet" until an email provider or GitHub sign-in is configured.
  - Guest mode works.
- Two Hobby-plan points:
  - Preview deployments of other branches ask for a Vercel login. The production address is public.
  - Vercel describes the Hobby plan as being for personal, non-commercial use. Check its current terms before the institute goes live.

## Later

**Course content in the database.** Nothing reads it until search arrives in Phase 7. From then on, run `npm run content:sync` with `MONGODB_URI` set to the Atlas connection string, on your own machine, whenever `content/` changes. Do not commit the string.

Each of the following needs a redeploy afterwards, because the sign-in page is built once.

- **Email sign-in:** choose a provider (it receives learners' email addresses), then set `EMAIL_TRANSPORT=smtp`, `SMTP_URL` and `EMAIL_FROM`.
- **GitHub sign-in:** create an OAuth app on GitHub.
  - Callback URL: `https://<your-address>/api/auth/callback/github`.
  - Then set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
