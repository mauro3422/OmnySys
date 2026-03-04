import { SocietyEngine } from './layer-b-semantic/society-manager/SocietyEngine.js';
import { SocietyPersistor } from './layer-b-semantic/society-manager/SocietyPersistor.js';
import { getRepository } from './layer-c-memory/storage/repository/index.js';

async function test() {
    console.log("Starting...");
    const engine = new SocietyEngine('c:/Dev/OmnySystem');
    const persistor = new SocietyPersistor('c:/Dev/OmnySystem');
    const atomsList = await getRepository('c:/Dev/OmnySystem').getAll();
    console.log("Loaded atomsList:", atomsList.length);
    const societies = await engine.buildSocieties();
    console.log("Societies generated:", societies.length);

    try {
        await persistor.saveSocieties(societies);
        console.log("Success! Persisted societies.");
    } catch (e) {
        console.log("Failed to persist:", e.message);
    }
}
test();
