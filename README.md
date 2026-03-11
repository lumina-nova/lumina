# LuminaKafka

**A modern, lightning-fast Kafka UI built for developers**

---

## What is LuminaKafka?

LuminaKafka is a high-performance user interface for Apache Kafka that makes monitoring and debugging your Kafka clusters fast and enjoyable.

Built with **Go** and **React**, it's designed to be 10x faster than traditional Java-based Kafka UIs.

---

## Why LuminaKafka?

**The Problem:**
- Current Kafka UIs are slow (30+ second startup times)
- Clunky interfaces from 2015
- Can't handle high-throughput topics without freezing
- Heavy memory usage (500MB+)

**Our Solution:**
- ⚡ **Instant startup** - Ready in <3 seconds
- 🎨 **Modern UI** - Beautiful, responsive design
- 💾 **Lightweight** - Uses <50MB memory
- 🚀 **Real-time streaming** - WebSocket, not polling
- 🔒 **Privacy-first** - Optional local AI (your data never leaves)

---

## Status

🚧 **Currently in development** - Phase 1 (Core UI)

We're building the foundation. Star this repo to follow progress!

**What's coming:**
- Phase 1: Core Kafka UI with real-time streaming
- Phase 2: AI-powered semantic search
- Phase 3: Enterprise features

---

## Quick Start

*Coming soon with v1.0.0 release*
```bash
docker run -p 8080:8080 \
  -e KAFKA_BROKERS=localhost:9092 \
  luminakafka/ui:latest
```

---

## Technology Stack

- **Backend:** Go + franz-go (Kafka client)
- **Frontend:** Next.js + React + TypeScript
- **UI Components:** shadcn/ui + Tailwind CSS
- **Virtual Scrolling:** React Virtuoso
- **AI:** Ollama (local, Phase 2)

---

## Contributing

We're just getting started and would love your help!

- ⭐ **Star this repo** to show support
- 👀 **Watch** for updates
- 💬 **Open discussions** to share ideas
- 🐛 **Report bugs** when we have something to test

---

## License

Apache 2.0

---

**Built with ❤️ for the Kafka community**