# Graph
Experimental graph data structure for performing incremental computation.

TODO
* Design
    * Reconcile tree encoding with the Forest (immutable) style design patterns
    * Global IDs
        * Add skeleton abstraction around identity that would allow you to tinker with various schemes in the
          actual code.
    * Tree
        * Constrain graph to tree (or make graph a special encoding of tree?)
    * Schema
        * Add type & cardinality constraints to encoding.
    * Synthetic nodes
        * Try implementing synthetic nodes from string primitives?
    * Lifetime: currently 'deleteNode()' leaves dangling references in the graph to delete nodes.
        * ACR: Auto-delete nodes when they no longer referenced.
        * Bidirectional graph: track parents and remove references on delete.
* Perf
    * Intern / reuse type info.
    * Improve children representation:
        * Store as (GraphNode | GraphNode[]) to avoid array alloc for 0/1 children.
* Bugs
    * Graph can not store 'undefined' scalar (array encoding should use a sentinel to avoid conflict)
