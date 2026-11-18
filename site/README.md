# Chameleon website

The public site: an overview of Chameleon and a repair ticket page. Static HTML, CSS and JS,
plus one Vercel function (`api/repair.js`) that emails each ticket.

## Deploy on Vercel

Import the repository and set **Root Directory** to `site`. No build step is needed.

## Email for repair tickets

Tickets go to `chameleon@dailyos.uk` (change with `TICKET_TO`), with a copy to the customer.
Set one of these in the Vercel project's Environment Variables:

- SMTP, for example Gmail with an app password:
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<the Gmail address>`, `SMTP_PASS=<the app password>`
- or Resend: `RESEND_API_KEY=<key>` and `MAIL_FROM=Chameleon Repairs <repairs@your-domain>`

`MAIL_FROM` defaults to `Chameleon Repairs <SMTP_USER>`. Redeploy after changing variables.

## Serials from OrderTrack

The repair form only accepts serials of real Chameleon orders. OrderTrack sends the list
(serial, model, colour, status and order date only) a few seconds after any change.

1. In Vercel, open the project, then Storage, and create a Blob store connected to this project.
   That adds `BLOB_READ_WRITE_TOKEN` by itself.
2. In OrderTrack, Settings, Website: turn on "Send serials to the website" and copy the sync key.
3. In Vercel, add an environment variable `SYNC_TOKEN` with that key, then redeploy.
4. Back in OrderTrack, press "Send now". It should say how many serials it sent.

## Editing content

Colours, models and delivery wording live in `assets/catalog.js`.
