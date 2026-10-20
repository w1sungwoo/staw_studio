const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'songs.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 초기 기본 K-POP 데이터베이스 샘플
const defaultSongs = [
    { id: '1', title: 'Magnetic', artist: 'ILLIT (아일릿)', album: 'SUPER REAL ME', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80', audio: 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', type: 'audio', liked: true },
    { id: '2', title: 'Supernova', artist: 'aespa (에스파)', album: 'Armageddon - The 1st Album', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80', audio: 'https://www.bensound.com/bensound-music/bensound-energy.mp3', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', type: 'audio', liked: true },
    { id: '3', title: 'Spot! (feat. JENNIE)', artist: 'ZICO (지코)', album: 'SPOT!', cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop&q=80', audio: 'https://www.bensound.com/bensound-music/bensound-retrosoul.mp3', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'audio', liked: false },
    { id: '4', title: 'How Sweet', artist: 'NewJeans (뉴진스)', album: 'How Sweet', cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80', audio: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', type: 'audio', liked: true },
    { id: '5', title: 'SHEESH', artist: 'BABYMONSTER (베이비몬스터)', album: 'BABYMONS7ER', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80', audio: 'https://www.bensound.com/bensound-music/bensound-badass.mp3', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4', type: 'audio', liked: false }
];

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultSongs, null, 2), 'utf-8');
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// File storage configuration using Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });

// Helper functions to read/write JSON database file
function readDatabase() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Database Error:", err);
        return [];
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error("Database Write Error:", err);
    }
}


// 1. Get all songs
app.get('/api/songs', (req, res) => {
    const songs = readDatabase();
    res.json(songs);
});

// 2. Upload media file (audio/video/cover image)
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.originalname });
});

// 3. Add new song
app.post('/api/songs', (req, res) => {
    const songs = readDatabase();
    const newSong = {
        id: Date.now().toString(),
        title: req.body.title || '제목 없음',
        artist: req.body.artist || '아티스트 미상',
        album: req.body.album || '싱글',
        cover: req.body.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        audio: req.body.audio || '',
        video: req.body.video || '',
        type: req.body.type || 'audio',
        liked: Boolean(req.body.liked)
    };
    songs.push(newSong);
    writeDatabase(songs);
    res.status(201).json(newSong);
});

// 4. Update song by ID
app.put('/api/songs/:id', (req, res) => {
    const songId = req.params.id;
    let songs = readDatabase();
    const index = songs.findIndex(s => s.id === songId);

    if (index === -1) {
        return res.status(404).json({ error: '해당 음악을 찾을 수 없습니다.' });
    }

    songs[index] = {
        ...songs[index],
        ...req.body
    };

    writeDatabase(songs);
    res.json(songs[index]);
});

// 5. Toggle Like state
app.patch('/api/songs/:id/like', (req, res) => {
    const songId = req.params.id;
    let songs = readDatabase();
    const song = songs.find(s => s.id === songId);

    if (!song) {
        return res.status(404).json({ error: '해당 음악을 찾을 수 없습니다.' });
    }

    song.liked = !song.liked;
    writeDatabase(songs);
    res.json(song);
});

// 6. Delete song by ID
app.delete('/api/songs/:id', (req, res) => {
    const songId = req.params.id;
    let songs = readDatabase();
    const initialLength = songs.length;
    songs = songs.filter(s => s.id !== songId);

    if (songs.length === initialLength) {
        return res.status(404).json({ error: '삭제할 음악을 찾을 수 없습니다.' });
    }

    writeDatabase(songs);
    res.json({ message: '성공적으로 삭제되었습니다.', id: songId });
});

app.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`🎵 Staw Music Server is running on port ${PORT}`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`================================================`);
});