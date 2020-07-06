module.exports = Object.freeze({
    online: 1,
    offline: 2,
    dnd: 3,
    idle: 4,
    busy: 3,
    vc: 6,
    isValid: (x) => [1, 2, 3, 4, 5, 6].includes(x),
    toStatus: (x) => ['invalid', 'online', 'offline', 'dnd', 'idle', 'busy', 'vc'][x]
});