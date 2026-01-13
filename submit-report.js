import formidable from 'formidable';
import axios from 'axios';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

const WEBDAV_URL = process.env.NEXTCLOUD_WEBDAV_URL;
const AUTH = {
  username: process.env.NEXTCLOUD_USER,
  password: process.env.NEXTCLOUD_PASSWORD,
};

export default async function handler(req, res) {
  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const siteId = fields.siteId;
    const folderPath = `/Relatorios/${siteId}`;

    try {
      // Criar pasta do site no Nextcloud
      await axios({
        method: 'MKCOL',
        url: `${WEBDAV_URL}${folderPath}`,
        auth: AUTH,
      }).catch(() => {});

      // Criar subpasta "fotos"
      await axios({
        method: 'MKCOL',
        url: `${WEBDAV_URL}${folderPath}/fotos`,
        auth: AUTH,
      }).catch(() => {});

      // Salvar as fotos e os dados
      for (const key in files) {
        const uploaded = Array.isArray(files[key]) ? files[key] : [files[key]];

        for (const file of uploaded) {
          const buffer = fs.readFileSync(file.filepath);
          await axios.put(`${WEBDAV_URL}${folderPath}/fotos/${file.originalFilename}`, buffer, {
            auth: AUTH,
            headers: { 'Content-Type': 'application/octet-stream' },
          });
        }
      }

      // Salvar os dados das seções
      await axios.put(`${WEBDAV_URL}${folderPath}/dados.json`, JSON.stringify(fields, null, 2), {
        auth: AUTH,
        headers: { 'Content-Type': 'application/json' },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
