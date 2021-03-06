/**
 * this controller serve all "Game" related actions such as game initiation
 */

const game = new Game($('div#game-current-area'));

$(() => {
    const FLAG_NONE             = 0x00;
    const FLAG_USERNAME         = 0x01;
    const FLAG_BATTLEFIELD_SIZE = 0x02;
    const FLAG_ALL              = FLAG_USERNAME | FLAG_BATTLEFIELD_SIZE;

    let bytes = FLAG_NONE;
    const highlightInputSection = (el, flag) : void => {
        el.classList.remove('has-success');
        el.classList.remove('has-error');
        el.classList.add((bytes & flag) === flag ? 'has-success' : 'has-error');

        game.modalMgr.unlockSubmission((bytes & FLAG_ALL) === FLAG_ALL);
    };

    // /** open modal for new game when page is loaded */
    // game.modalMgr.updateHTML(game.constructor.resources.html.modal).show();
    /** initiate game when page is loaded */
    game.apiMgr.pageMgr.switchSection(<HTMLElement>document.querySelector('.page-sidebar li[data-section="game-current-area"]'));
    game.init('Player controlled by Human', 7);

    $('#game-current-area')
        .on('click', '.player-area[data-player-flag="1"] .battlefield-cell[data-flags="0"]', function (e) {
            e.stopPropagation();

            game.update(parseInt(this.getAttribute('data-id')));
        });
    $('.page-sidebar')
        .on('click', 'li[data-action="game-new-action"]', function (e) {
            e.stopPropagation();

            game.popupMgr.hide();
            game.modalMgr
                .updateHTML(Game.resources.html.modal())
                .show();
        });
    $('#modal-area')
        .on('input', '#model-input-player-name', function (e) {
            /** modal area: player name */
            e.stopPropagation();

            Game.resources.validate.username((<HTMLInputElement>this).value)
                ? bytes |= FLAG_USERNAME
                : bytes &= ~FLAG_USERNAME;

            highlightInputSection(this.parentElement, FLAG_USERNAME);
        })
        .on('input', '#model-input-battlefield-size', function (e) {
            /** modal area: battlefield size */
            e.stopPropagation();

            const pattern = Game.resources.config.pattern;
            let value = <any>(<HTMLInputElement>this).value;

            if (!isNaN(value) && value > pattern.battlefield.max) {
                value = pattern.battlefield.max;
                (<HTMLInputElement>this).value = <any>value;
            }

            Game.resources.validate.battlefield.size(<number>value)
                ? bytes |= FLAG_BATTLEFIELD_SIZE
                : bytes &= ~FLAG_BATTLEFIELD_SIZE;

            highlightInputSection(this.parentElement, FLAG_BATTLEFIELD_SIZE);
        })
        .on('click', '#button-init-new-game', function (e) {
            /** modal area: submit */
            e.stopPropagation();

            game.apiMgr.pageMgr.switchSection(<HTMLElement>document.querySelector('.page-sidebar li[data-section="game-current-area"]'));

            const playerName = document.getElementById('model-input-player-name').getAttribute('value');
            const gameSize = parseInt(document.getElementById('model-input-battlefield-size').getAttribute('value'), 10);

            game.init(playerName, gameSize);
        });
});
