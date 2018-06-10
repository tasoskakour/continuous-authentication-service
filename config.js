if (process.env.KEYSTROKE_DYNAMICS_MLAB_HOST === undefined) {
    throw new Error('Env Variable KEYSTROKE_DYNAMICS_MLAB_HOST is undefined');
}
if (process.env.KEYSTROKE_DYNAMICS_MLAB_USER === undefined) {
    throw new Error('Env Variable KEYSTROKE_DYNAMICS_MLAB_USER is undefined');
}
if (process.env.KEYSTROKE_DYNAMICS_MLAB_PASSWORD === undefined) {
    throw new Error('Env Variable KEYSTROKE_DYNAMICS_MLAB_PASSWORD is undefined');
}
if (process.env.KEYSTROKE_DYNAMICS_TOKEN_SECRET === undefined) {
    throw new Error('Env Variable KEYSTROKE_DYNAMICS_MLAB_TOKEN_SECRET is undefined');
}

module.exports = {
    port: process.env.PORT || 5000,
    database: `mongodb://${process.env.KEYSTROKE_DYNAMICS_MLAB_USER}:${process.env.KEYSTROKE_DYNAMICS_MLAB_PASSWORD}@${process.env.KEYSTROKE_DYNAMICS_MLAB_HOST}`,
    secret: process.env.KEYSTROKE_DYNAMICS_TOKEN_SECRET
};