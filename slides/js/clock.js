/**
 * Event listener for 'slideshowLoaded' event.
 * This function creates and styles a clock element that displays the remaining time.
 * The clock starts with a click and counts down from 10 minute, adding 10 minutes on each subsequent click.
 * The clock changes color based on the remaining time:
 * - Red: Time is up or overtime.
 * - Orange: Less than 5 minutes remaining.
 * - Silver: More than 5 minutes remaining.
 */
document.addEventListener(
  'slideshowLoaded',
  async (evt) => {
    const stylesElem = document.createElement('style');
    stylesElem.textContent = `
        .slidedeck .clock {
            display : none;
        }

        .slidedeck.speaker .clock {
            position : absolute;
            bottom : 0;
            right : 0;
            width : 200px;
            height: 2em;
            background-color : black;
            color : silver;
            font-size : 1.7em;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
    }`;
    document.head.appendChild(stylesElem);

    const clockElem = document.createElement('div');
    clockElem.classList.add('clock');

    document.querySelector('.slidedeck').appendChild(clockElem);

    function tick() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      let timeText = `${hours}:${minutes}`;

      const currentSlideNumber = parseInt(window.location.hash.substring(1));
      const totalSlideNumber = document.querySelectorAll('.slidedeck section').length;

      const countText = `${String(currentSlideNumber).padStart(2, '0')}/${String(totalSlideNumber).padStart(2, '0')}`;
      clockElem.innerText = countText + '   ' + timeText;
    }

    setInterval(tick, 1000);
  },
  true,
);
