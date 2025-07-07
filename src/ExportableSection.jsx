import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import * as htmlToImage from 'html-to-image';
import download from 'downloadjs';

function ExportableSection({ title, id, children }) {
  const ref = useRef();

  const handleDownload = async () => {
    if (ref.current) {
      const originalWidth = ref.current.style.width;
      const originalOverflow = ref.current.style.overflow;

      ref.current.style.width = 'max-content';
      ref.current.style.overflow = 'visible';

      await new Promise(r => setTimeout(r, 100));

      const dataUrl = await htmlToImage.toPng(ref.current);
      download(dataUrl, `${id}.png`);

      ref.current.style.width = originalWidth;
      ref.current.style.overflow = originalOverflow;
    }
  };

  return (
    <div className="relative mb-12">
      <div ref={ref} className="mb-4 snapshot-target">
        {children}
      </div>
      <button
        onClick={handleDownload}
        className="absolute top-0 right-0 mt-2 mr-2 bg-[#2EC4B6] text-white px-3 py-1 rounded shadow hover:bg-[#25a59e]"
      >
        Download Snapshot
      </button>
    </div>
  );
}

ExportableSection.propTypes = {
  title: PropTypes.string,
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

export default ExportableSection;