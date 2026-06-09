/* =========================================================
   SOLE DYNAMIC FAVICON
========================================================= */

(function initSoleDynamicFavicon(){

  const favicon =
    document.getElementById("soleDynamicFavicon") ||
    document.querySelector('link[rel="icon"]');

  if (!favicon) return;

  const colours = {
    gold : "#ffc805",
    blue : "#2dcfd0",
    teal : "#20aa91",
    red  : "#ff4f73"
  };


  const sequence = [
    colours.gold,
    colours.blue,
    colours.teal,
    colours.red
  ];

  let colourIndex = 0;
  let spreadIndex = 0;

  function buildSvg(ringColours){

    return `
      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 32 32">

        <circle
          cx="16"
          cy="16"
          r="15"
          fill="none"
          stroke="${ringColours[3]}"
          stroke-width="1.25"/>

        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="${ringColours[2]}"
          stroke-width="1.25"/>

        <circle
          cx="16"
          cy="16"
          r="9"
          fill="none"
          stroke="${ringColours[1]}"
          stroke-width="1.25"/>

        <circle
          cx="16"
          cy="16"
          r="6"
          fill="none"
          stroke="${ringColours[0]}"
          stroke-width="1.25"/>

      </svg>
    `;
  }

  function updateFavicon(){

    const current =
      sequence[colourIndex];

    const next =
      sequence[(colourIndex + 1) % sequence.length];

    const ringColours = [
      spreadIndex >= 1 ? next : current,
      spreadIndex >= 2 ? next : current,
      spreadIndex >= 3 ? next : current,
      spreadIndex >= 4 ? next : current
    ];

    const svg =
      buildSvg(ringColours);

    favicon.href =
      "data:image/svg+xml," +
      encodeURIComponent(svg);

    spreadIndex++;

    if (spreadIndex > 4){

      spreadIndex = 0;

      colourIndex =
        (colourIndex + 1) %
        sequence.length;
    }
  }

  updateFavicon();

  setInterval(
    updateFavicon,
    450
  );

})();