import {type JSX, useEffect, useRef} from 'react';
import "./index.scss";


const PageTitle: () => JSX.Element = () => {
    const titleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const titleElement = titleRef.current;
        if (!titleElement) {
            return;
        }

        setTimeout(() => {
            titleElement.classList.add('show');
        }, 100);

        return () => {
            titleElement.classList.remove('show');
        };
    }, []);

    return (
        <div className="page-title" ref={titleRef}>
            <i className="fa-regular fa-square"/>
            Elemental Weather
        </div>
    );
};

export default PageTitle;
