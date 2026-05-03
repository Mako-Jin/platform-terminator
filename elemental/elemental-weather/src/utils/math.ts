import MersenneTwister from 'mersennetwister';


const MT_ = new MersenneTwister(7);

function random() {
    return MT_.random();
}


export {
    // saturate,
    // inverseLerp,
    // clamp,
    // remap,
    // lerp,
    random,
    // Vec3Interpolat,
    // FloatInterpolat,
    // ColorInterpolat,
};
