# Blurd.chat

En peer-to-peer webcam platform hvor brugere kan forbinde med tilfældige peers. Begge brugeres ansigter og brugernavne er slørede indtil begge accepterer at fjerne sløringen.

## Features

- 🎥 Peer-to-peer video chat
- 🔒 Sløring af video og brugernavn
- 💬 Text chat
- 🎤 Mikrofon kontrol
- 🪙 Mønt system for meningsfulde forbindelser
- 👥 Venneliste
- 📊 Fremskridtssporing

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Firebase (Auth & Database)
- WebRTC
- Socket.IO

## Installation

1. Klon repository:
```bash
git clone https://github.com/Chrijaque/blurdchat.git
cd blurdchat
```

2. Installer dependencies:
```bash
npm install
```

3. Start udviklings server:
```bash
npm run dev
```

4. Åbn [http://localhost:3000](http://localhost:3000) i din browser.

## Environment Variables

Opret en `.env.local` fil i rod mappen med følgende variabler:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Deployment

Projektet er konfigureret til automatisk deployment på Vercel. 