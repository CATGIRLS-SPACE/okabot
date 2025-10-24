import {MMFFile} from "./mmf";
import {join} from "path";
import {BASE_DIRNAME} from "../../index";
import {ChatInputCommandInteraction} from "discord.js";

enum JLPTGameState {
    SETUP,
    PLAY_MEANING,
    PLAY_READING_KUN,
    PLAY_READING_ON,
    PLAY_MIXED_READING,
    PLAY_MIXED_ALL,
    VIEW_RESULTS,
    ENDED
}

interface JLPTGame {
    interaction: ChatInputCommandInteraction,
    state: JLPTGameState,
    question: {
        card: {
            category: string,
            question: string,
            answers: string[],
        }
    },
    question_history: Array<{
        card: {
            category: string,
            question: string,
            answers: string[],
        },
        correct: boolean,
    }>,
    expires: number
}

export function JLPTStartGame(interaction: ChatInputCommandInteraction, deck: 'n5' | 'n4') {
    // const cards = new MMFFile(join(BASE_DIRNAME, 'assets', 'jlpt', `${deck}.mmf`));
    // const game: JLPTGame = {
    //     interaction,
    //     state: JLPTGameState.PLAY_MEANING,
    //     question: cards.cards
    // }
    interaction.editReply({
        content:'# あ *JLPT Study Game*\n'
    });
}


// function CreateStudyRoom() {
//     return;
// }