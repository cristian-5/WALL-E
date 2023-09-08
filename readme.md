
## WALL-E

<img align="right" width="40" height="40" hgap="50" src="wall-e.png">

🧮 **w**ebassembly **all**ocator, **handwritten** with 💗 in *assemblyscript*.

## Strategy:

The strategy employs a straightforward bump allocation approach while
efficiently managing freed blocks through a linked list encoded within each
block's header.
For every allocated block, an 8-byte header is initially reserved to store
both the logical and effective sizes. When a block is later freed, this
header is repurposed to hold the effective pointer to the next free block
and the effective size.
The allocation strategy follows a "best-fit" paradigm, where the allocator
seeks out the free block with the smallest size equal to or greater than
the requested size, minimizing fragmentation. Notably, the effective size,
which excludes the header size, represents the actual usable content size,
while the logical size is the size originally requested by the user.

```
+-< effective pointer             +-< logical pointer
!                                 !
+----------------+----------------+--------------------------------------+
|  logical size  | effective size | ... allocated data ................. |
|----------------+----------------+--------------------------------------+
|  next block *  | effective size | ... unallocated data ............... |
+----------------+----------------+--------------------------------------+
```

## API Usage:

To allocate memory, use the `allocate` function:
``` ts
export function allocate(s: u32): ptr
```
To free memory, use the `deallocate` function:
```  ts
export function deallocate(p: ptr): void
```
To resize previously allocated memory, use the `reallocate` function:
``` ts
export function reallocate(p: ptr, s: u32): ptr
```
To get the size of previously allocated sections, use the `size` function:
``` ts
export function size(p: ptr): u32
```

> ⚠️ **Warning:** Allocations are not zeroed out, memory is not aligned, and
> the allocator is not thread-safe.

> ⛔ **Critical:** If you intend to use this library, **DO NOT**, under any
> circumstances, access directly raw unmanaged memory.

``` js
WebAssembly.instantiateStreaming(fetch("wall-e.wasm"))
           .then(({ instance }) => { /* ... */ });
```
