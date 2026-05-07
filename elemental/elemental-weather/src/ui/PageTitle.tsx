import { useEffect, useRef } from 'react';

const PageTitle: () => JSX.Element = () => {
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;

    setTimeout(() => {
      titleElement.classList.add('show');
    }, 1000);

    return () => {
      titleElement.classList.remove('show');
    };
  }, []);

  return (
    <div id="page-title" ref={titleRef}>
      <i className="fa-regular fa-square"/>
      Elemental Serenity
    </div>
  );
};

export default PageTitle;
