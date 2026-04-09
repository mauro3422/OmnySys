import { getRepository } from '../src/layer-c-memory/storage/repository/repository-factory.js';
import { rowToAtom } from '../src/layer-c-memory/storage/repository/adapters/helpers/converters.js';

const r = getRepository('C:/Dev/OmnySystem');

// Get atoms and apply rowToAtom same as getAllAtoms
const rows = r.db.prepare("SELECT * FROM atoms LIMIT 100").all();
const atoms = rows.map(rowToAtom).filter(Boolean);

// Check what rowToAtom gives us
const a = atoms[0];
console.log('Sample atom keys:', Object.keys(a).join(', '));
console.log('Sample linesOfCode:', a.linesOfCode, 'isAsync:', a.isAsync, 'hasNetworkCalls:', a.hasNetworkCalls);

// Check how many async+noCatch exist
const asyncNoErr = atoms.filter(a => a.isAsync && !a.hasErrorHandling);
console.log('Async without error handling (first 100):', asyncNoErr.length);

// Test our specific condition for error handling
const networkNoErr = atoms.filter(a => a.isAsync && !a.hasErrorHandling && (a.hasNetworkCalls || a.calls?.some(c => c.name?.includes('readFile'))));
console.log('Network-async without error handling:', networkNoErr.length);
