# Apache redirect configs (brainsait host)

Copies of the live files in `/etc/apache2/sites-available/` on the `brainsait` server (symlinked into `sites-enabled/`). The server does not keep them under version control, so this directory is the record. Deploy by copying the file over, then `sudo apachectl configtest && sudo systemctl reload apache2`.

| File | Purpose |
| --- | --- |
| `givc-nphies-redirect.conf` | `givc.de` and `nphies.de` (and `www.`) redirect into brainsait.de with paths kept: registry paths (`/p/`, `/fhir/`, `/api/`, `/verify`, `/transparency`, `/workspace`, `/directory`, `/registry.json`) go to `registry.brainsait.de`; `nphies.de` otherwise lands on `/developers/`, `givc.de` on `/hub/`. Uses the `nphies.de` certificate. |
| `zz-brainsait-wildcards.conf` | Catch-all for unknown `*.brainsait.de` and `*.givc.de` names. Loaded last so named sites keep priority. Provider names under `givc.de` go to their registry profile; other provider, organisation, nurse or pharmacy names go to the registry directory. |

Notes
- `*.givc.de` only covers one label; deeper names such as `dr.<slug>.givc.de` must be listed on the `wildcard-givc.de` certificate to get a valid TLS connection.
- IPv4 A records for `givc.de` and `nphies.de` still point at the old shared host, so these rules only reach visitors who arrive over IPv6 until the A records are repointed to this server.
- Test without DNS: `curl -sI --resolve givc.de:443:<server-ip> https://givc.de/p/SA-PHY-000001`.
