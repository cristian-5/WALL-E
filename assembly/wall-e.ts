
// INFO: asc assembly/wall-e.ts --outFile wall-e.wasm --optimize

//  wall-e allocator, copyright (c) Cristian A.
//  +-< effective pointer             +-< logical pointer
//  !                                 !
//  +----------------+----------------+--------------------------------------+
//  |  logical size  | effective size | ... allocated data ................. |
//  |----------------+----------------+--------------------------------------+
//  |  next block *  | effective size | ... unallocated data ............... |
//  +----------------+----------------+--------------------------------------+

type ptr = u32;
export const nil: ptr = 0;

let list: ptr = 0;
let heap: ptr = 8;

/// finds the logical size of the block
/// pointed by the logical pointer p
export function size(p: ptr): u32 {
	return load<u32>(p - 8);
}

/// bump-allocates a block of logical size
/// ls returning a logical pointer to it
function bump(ls: u32): ptr {
	let space: u32 = heap + ls + 8;
	if (space > <u32>(memory.size() * 0x10000)) // 64KB
		if (memory.grow(space / 0x10000 - <u32>memory.size() + 1) == -1)
			return nil; // memory exhausted
	store<u32>(heap, ls);     // logical size
	store<u32>(heap + 4, ls); // effective size
	let p: ptr = heap + 8;
	heap = space; // bump
	return p;
}

/// finds the smallest free block of logical size equal
/// or greater than ls, returning an effective pointer.
function best_fit(ls: u32): u32 {
	let ep: u32 = list;        // effective pointer (cursor)
	let bf: u32 = nil;           // best fit
	let bs: u32 = u32.MAX_VALUE; // best size
	while (ep) {
		let es: u32 = load<u32>(ep + 4); // effective size
		if (es == ls) return ep;         // perfect fit
		if (es > ls && es < bs) { // best fit so far
			bs = es;
			bf = ep;
		}
		ep = load<u32>(ep); // next free block
	}
	if (bs <= (ls + ls / 4)) return bf; // best fit (not exceeding 125% of ls)
	return nil; // no free block with elegible size
}

/// repurposes the smallest free block of effective size equal
/// or greater than ls, returning a effective pointer
function repurpose(ep: ptr, ls: u32): ptr {
	let p: ptr = list;
	while (p) { // guaranteed to find ep's parent
		if (load<ptr>(p) == ep) { // parent link:
			store<ptr>(p, load<ptr>(ep)); // skip ep
			break;
		}
		p = load<ptr>(p);
	}
	// revive ep as a new block:
	store<u32>(ep, ls); // set ep's logical size
	return ep + 8;      // logical pointer
}

/// allocates a block of logical size s
export function allocate(s: u32): ptr {
	if (!s) return nil;
	let ef: ptr = best_fit(s);
	if (!ef) return bump(s);
	return repurpose(ef, s);
}

/// deallocates a block pointed by the logical pointer p
export function deallocate(p: ptr): void {
	p -= 8;                // get effective pointer
	store<ptr>(p, list); // header points to the next free block
	list = p;            // set p as new head of the free list
}

/// reallocates a block pointed by the logical pointer p
/// to a new logical size s; it does so by either shrinking
/// or growing the block (when possible), or by allocating a new
/// one and copying the contents of the old one (when necessary);
/// if s is 0, the block is deallocated and nil is returned
export function reallocate(p: ptr, s: u32): ptr {
	if (!s) {
		deallocate(p);
		return nil;
	}
	let ep: ptr = p - 8;
	let ls: u32 = size(p); // logical size of p
	if (s > ls) {
		if (load<u32>(ep + 4) >= s) { // es can accomodate s, grow:
			store<u32>(ep, s); // set ep's logical size to requested size
			return p;
		}
		// can't grow, allocate new block:
		let n: ptr = allocate(s); // get logical pointer to new block
		memory.copy(n, p, ls);      // copy contents of old block to new one
		deallocate(p);            // deallocate old block
		return n;                   // return new block's logical pointer
	}
	// shrink or keep (no need to grow or allocate a new block):
	store<u32>(ep, s); // set ep's logical size to requested size
	return p;          // return old block's logical pointer
}
