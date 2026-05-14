const multer = require('multer');
const path = require('path');
const fs = require('fs');

const getStorage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads', subfolder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} not allowed. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB

const uploadSubmission = multer({
  storage: getStorage('submissions'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: fileFilter(['pdf', 'jpg', 'jpeg', 'png'])
});

const uploadModelAnswer = multer({
  storage: getStorage('model-answers'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: fileFilter(['pdf', 'jpg', 'jpeg', 'png', 'txt', 'docx'])
});

const uploadQuestionPaper = multer({
  storage: getStorage('question-papers'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: fileFilter(['pdf', 'jpg', 'jpeg', 'png', 'docx'])
});

const uploadAvatar = multer({
  storage: getStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'webp'])
});

const uploadQuestionParser = multer({
  storage: getStorage('question-papers'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: fileFilter(['pdf', 'txt', 'docx'])
});

module.exports = { uploadSubmission, uploadModelAnswer, uploadQuestionPaper, uploadAvatar, uploadQuestionParser };
