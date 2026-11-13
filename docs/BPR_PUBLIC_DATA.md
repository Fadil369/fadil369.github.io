# BPR public data sources

The research page lets visitors explicitly request KFMC research open data and the Saudi Open Data private-sector health-insurance dataset metadata and resources. Requests go directly from the browser to the publishers without credentials. Publisher availability, response shape and CORS policy determine whether they work; an error is shown instead of substituting sample data. The dataset metadata is not individual insurance coverage data.

National Address is not connected. It requires a subscription and an authenticated, rate-limited HTTPS backend that protects the API key. Do not put that key in frontend code or transmit patient addresses or coordinates from this site.

Run `npm run verify:bpr-ux` after publishing a build to test English and Arabic journeys, mocked public-source responses, errors and verification states. Mocked tests do not establish that the real publishers permit browser access.
