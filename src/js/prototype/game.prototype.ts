class Game {
    public $html: JQuery;

    public popupMgr: PopupMgr;
    public modalMgr: ModalMgr;
    public players: Player[];
    public apiMgr: APIRequestService;

    constructor($el: JQuery) {
        this.$html = $el;

        this.popupMgr = new PopupMgr();
        this.modalMgr = new ModalMgr();
        this.apiMgr = new APIRequestService();
    }

    init(playerName: string, battlefieldSize: number) {
        this.players = [];
        this.$html.html('');

        const self = this;
        const onSuccess = (response: XMLHttpRequest): void => {
            self.parseInitResponse(response);
        };

        /** construct player */
        let player = new Player(playerName, battlefieldSize);
        /** append player's HTML to the document */
        this.$html.append(player.$html);
        /** save human player **/
        this.players.push(player);

        const requestData = {
            playerName: playerName,
            opponents: 1, //TODO: multi-player feature
            size: battlefieldSize,
            coordinates: player.battlefield.cells
                .filter(cell => cell.hasFlag(Cell.resources.flags.ship))
                .map(cell => cell.coordinate)
        };

        this.apiMgr.request('POST', this.$html.attr('data-init-link'), requestData, onSuccess);
    }

    parseInitResponse(xhr: XMLHttpRequest): void {
        const response = JSON.parse(xhr.response);
        /**
         * @param {
         *      {
         *          id: {number},
         *          player: {
         *              id: {number},
         *              name: {string}
         *          },
         *          cells: {
         *              id: {number},
         *              coordinate: {string},
         *              flags: {number}
         *          }[]
         *      }[]
         *  } response
         *
         *  @param {Battlefield} battlefield
         */
        response.forEach(battlefield => {
            let player;

            try {
                player = this.findPlayerByName(battlefield.player.name);
            } catch (ex) {
                const size = Math.sqrt(Object.keys(battlefield.cells).length);
                player = new Player(battlefield.player.name, size, true);

                this.$html.prepend(player.$html);
                this.players.push(player);
            }

            player.setId(battlefield.player.id);

            Object.keys(battlefield.cells).forEach(index => {
                const _cell = battlefield.cells[index];
                const cell = this.findPlayerCellByCriteria({ playerId: player.id, coordinate: _cell.coordinate });

                cell.setId(_cell.id).setFlags(_cell.flags);
            });
        });
    }

    update(cellId: number): void {
        this.cellSend(this.findPlayerCellByCriteria({ id: cellId }));
    }

    findPlayerById(id: number): Player {
        const player = this.players.find(player => player.id === id);
        if (undefined !== player) {
            return player;
        }

        throw `player with id: ${id} not found`;
    }

    findPlayerByName(name: string): Player {
        const player = this.players.find(player => player.name === name);
        if (undefined !== player) {
            return player;
        }

        throw `player with name: "${name}" not found`;
    }

    cellSend(cell: Cell): void {
        const self = this;
        const onSuccess = (response): void => {
            self.parseUpdateResponse(response);
        };

        this.apiMgr.request('PATCH', this.$html.attr('data-turn-link') + cell.id, undefined, onSuccess);
    }

    /**
     * @param {{cells: {id: {number}, flags: {number}}[], result: {player: {Object}}}} response
     */
    parseUpdateResponse(response: any) {
        response.cells.forEach(cell => this.findPlayerCellByCriteria({ id: parseInt(cell.id) }).setFlags(cell.flags));

        /** detect victory */
        if (undefined !== response.result) {
            const text = Game.resources.config.text;

            this.findPlayerById(response.result.player.id).isAIControlled()
                ? this.popupMgr.show(text.loss, 'danger')
                : this.popupMgr.show(text.win, 'success');
        }
    }

    /**
     * @param {{playerId: {number}, id: {number}, coordinate: {string}}} criteria
     */
    findPlayerCellByCriteria(criteria: any): Cell {
        for (const player of this.players) {
            try {
                if (undefined !== criteria.playerId && criteria.playerId !== player.id) {
                    continue;
                }

                const cell = player.battlefield.findCellByCriteria(criteria);
                if (undefined !== cell) {
                    return cell;
                }
            } catch (exception) {
                console.log(exception);
            }
        }

        throw `cell not found by criteria: ${JSON.stringify(criteria)}`;
    }

    public static resources = {
        config: {
            text: {
                win: 'you won',
                loss: 'you lost'
            },
            pattern: {
                battlefield: {
                    min: 7,
                    max: 12
                },
                username: /^[a-zA-Z0-9\.\- @]{3,25}$/
            }
        },
        validate: {
            battlefield: {
                size: (value: number): boolean => {
                    const battlefield = Game.resources.config.pattern.battlefield;

                    return !isNaN(value) && value >= battlefield.min && value <= battlefield.max;
                }
            },
            username: (value: string): boolean => Game.resources.config.pattern.username.test(value)
        },
        html: {
            modal: (): string => {
                const pattern = Game.resources.config.pattern;

                return `
<div class="modal fade">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal">
                    <span aria-hidden="true">&times;</span>
                </button>
                <h4 class="modal-title">your details</h4>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="control-label" for="model-input-player-name">player name</label>
                    <input class="form-control" id="model-input-player-name" placeholder="">
                    <span class="help-block">pattern: "${pattern.username.toString()}"</span>
                    <span class="help-block">example: eugene.matvejev@gmail.com</span>
                </div>
                <div class="form-group">
                    <label class="control-label" for="model-input-battlefield-size">battlefield size</label>
                    <input type="test" class="form-control" id="model-input-battlefield-size"
                            placeholder="battlefield size ${pattern.battlefield.min} and ${pattern.battlefield.max}"/>
                    <span class="help-block">example: 7</span>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" id="button-init-new-game" class="btn btn-primary" disabled>next step</button>
            </div>
        </div>
    </div>
</div>`;
            }
        }
    }
}
