


const Loader = () => {

    return (
        // Loader Screen
        <div id="loader">
            <div className="loader-title">
                <i className="fa-regular fa-square"></i>Elemental Serenity
            </div>
            <div className="loader-progress">
                <div className="loader-progress-bar" id="progress-bar"></div>
            </div>
            <div className="loader-text" id="loader-text">Loading assets...</div>
            <div className="explore-buttons" id="explore-buttons">
                <button
                    className="explore-button explore-button-light"
                    id="explore-with-music"
                >
                    <i className="fas fa-music"></i>
                    <span>Explore with Music</span>
                </button>
                <button
                    className="explore-button explore-button-dark"
                    id="explore-without-music"
                >
                    <i className="fas fa-volume-mute"></i>
                    <span>Explore in Silence</span>
                </button>
            </div>
        </div>
    );

}

export default Loader;
