# Layers

## Local Data Structure
An observable graph data structure that efficiently supports non-collaborative reads/writes, serialization/deserialization, and
change notifications.



(One possibility is that this a proxied JSON-like object graph.)

## Adjustment
A secondary data structure that tracks the information necessary to adjust ops from a past refSeq# to the current local head.

Once clients have coalesced on the minSeq#, this data structure may be discarded until new edits arrive.  There may be a specialized
variants of the adjustment data structure for offline and/or undo/redo.

## Summaries / History
A component that serializes and deserializes the primary and secondary data structures.  (The extent of history retained should
be options.)

# Ops
We may find that applying stronger typing improves op efficiency.  (For example, allowing us to meld adjacent string nodes.)

One model is SharedMap's value type, which provides a way to define the legal ops on a value (e.g., incr.)
https://redis.io/commands

