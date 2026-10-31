import { iconArt, weaponIds } from './pixel-art.js';
export function icon(id, evolved = false) {
    const key = evolved && weaponIds.includes(id) ? `evolve-${id}` : Object.hasOwn(iconArt, id) ? id : 'shards';
    return `<img class="pixel-icon" src="./assets/pixel/icons/${key}.png" width="48" height="48" alt="" aria-hidden="true" draggable="false">`;
}
