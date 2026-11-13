# build-apply

Backend for the Build / Founder Accelerator application flow, rebuilt as PHP 8.3 + SQLite so it runs on the Hetzner host
(`build-apply.brainsait.de`). It replaces the Cloudflare Worker that lived on the retired `brainsait.org` zone.

| Endpoint | Purpose |
|---|---|
| `POST /apply` | Validate an application, store it, return the Shopify checkout URL. |
| `GET /progress/<ref>` | Progress, badges and milestones for the Track page. |
| `GET /installment/<ref>` | Payment schedule for the Account page. |
| `POST /customer/sync` | Store the account holder's marketing consent. |
| `POST /events/<stage>` | Journey analytics. Stores the stage name and time only, never the body. |
| `POST /webhook/shopify` | `orders/paid`, HMAC-verified, deduplicated by order id. Marks Paid + Approved, seeds the 16 milestones. |
| `GET /certificate/<ref>`, `/badge/<ref>` | Issued once, when every milestone is Completed. |
| `/customer/link-shopify`, `/customer/github-claim`, `/installment` (POST), `/webhook/forge/event` | Answer `501`: not built yet. |

## Not in this PR
Email (Resend), Shopify customer tags, Notion/Airtable mirroring, GitHub invites, instalment webhooks. Each is an optional
adapter to add once its secret exists. `BuildApply::MILESTONES` holds placeholder names: replace them with the real 16.

## Data and privacy
SQLite lives in `/var/lib/brainsait/build-apply/` (outside the web root, mode 750). Personal data is stored only there;
the Apache vhost has no access log and the app logs error class names only.

## Deploy
```
sudo mkdir -p /opt/build-apply && sudo git clone --filter=blob:none --sparse https://github.com/Fadil369/fadil369.github.io /opt/build-apply
sudo git -C /opt/build-apply sparse-checkout set build-apply
sudo install -d -o www-data -g www-data -m 750 /var/lib/brainsait/build-apply
sudo install -m 640 -o root -g www-data build-apply/deploy/build-apply.env.example /etc/build-apply.env   # then edit in the real values
sudo cp build-apply/deploy/build-apply.conf /etc/apache2/sites-available/ && sudo a2ensite build-apply.brainsait.de && sudo systemctl reload apache2
```
Then re-register the Shopify `orders/paid` webhook to `https://build-apply.brainsait.de/webhook/shopify` with the same
secret as `SHOPIFY_WEBHOOK_SECRET`.

## Tests
`php build-apply/tests/run.php`
