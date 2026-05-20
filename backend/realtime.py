import asyncio
from typing import Set
import json

class PubSub:
    def __init__(self):
        self._listeners: Set[asyncio.Queue] = set()

    def register(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._listeners.add(q)
        return q

    def unregister(self, q: asyncio.Queue):
        self._listeners.discard(q)

    def publish(self, event_type: str, data: dict = None):
        """Publish an event to all subscribers."""
        payload = json.dumps({"type": event_type, "data": data or {}})
        for q in self._listeners:
            try:
                loop = asyncio.get_running_loop()
                loop.call_soon_threadsafe(q.put_nowait, payload)
            except RuntimeError:
                # No running event loop in this thread, or queue is full
                pass

pubsub = PubSub()
