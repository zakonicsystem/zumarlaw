import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const root = fileURLToPath(new URL('../uploads/', import.meta.url));
fs.mkdirSync(root, { recursive: true });
const types = {
  '.pdf': ['application/pdf'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'], '.webp': ['image/webp'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.doc': ['application/msword'], '.xls': ['application/vnd.ms-excel'], '.txt': ['text/plain'], '.csv': ['text/csv','application/vnd.ms-excel','text/plain']
};
export function validFileHeader(extension, buffer) {
  const hex = buffer.subarray(0,8).toString('hex');
  if (extension === '.pdf') return buffer.subarray(0,5).toString() === '%PDF-';
  if (['.jpg','.jpeg'].includes(extension)) return hex.startsWith('ffd8ff');
  if (extension === '.png') return hex === '89504e470d0a1a0a';
  if (extension === '.webp') return buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP';
  if (['.docx','.xlsx'].includes(extension)) return hex.startsWith('504b0304');
  if (['.doc','.xls'].includes(extension)) return hex === 'd0cf11e0a1b11ae1';
  return ['.txt','.csv'].includes(extension) && !buffer.includes(0) && !/<(?:script|html|svg|iframe)/i.test(buffer.toString());
}
const storage = multer.diskStorage({ destination: root, filename: (req,file,cb) => cb(null,crypto.randomUUID() + path.extname(file.originalname).toLowerCase()) });
const write = storage._handleFile.bind(storage);
storage._handleFile = (req, file, cb) => write(req,file,async (error, info) => {
  if (error) return cb(error);
  try {
    const handle = await fs.promises.open(info.path,'r');
    const buffer = Buffer.alloc(Math.min(info.size,512));
    try { await handle.read(buffer,0,buffer.length,0); } finally { await handle.close(); }
    if (!validFileHeader(path.extname(info.filename),buffer)) throw new Error('File content does not match the allowed document type');
    cb(null,info);
  } catch (err) { await fs.promises.unlink(info.path).catch(() => {}); cb(err); }
});
export const uploadOptions = { storage, limits: { fileSize: 10 * 1024 * 1024, files: 20, fields: 200, fieldSize: 1024 * 1024 },
  fileFilter(req,file,cb) { const extension = path.extname(file.originalname).toLowerCase(); if (!types[extension]?.includes(file.mimetype)) return cb(new Error('Upload PDF, images, Word, Excel, CSV or text documents only')); cb(null,true); }
};
