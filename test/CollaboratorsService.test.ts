import test from "ava"
import { TestContext } from "ava"
import { Observable } from "rxjs"

import { Collaborator, CollaboratorsService } from "../src/collaborators"
import {
    BroadcastMessage,
    NetworkMessage,
    SendToMessage
} from "../src/network"

function disposeOf (collaboratorsService: CollaboratorsService, time: number): void {
    setTimeout(() => {
        collaboratorsService.clean()
    }, time)
}

test("pseudos-correct-send-and-delivery", (t: TestContext) => {
    const collaboratorsServiceIn = new CollaboratorsService()
    disposeOf(collaboratorsServiceIn, 200)
    const collaboratorsServiceOut = new CollaboratorsService()
    disposeOf(collaboratorsServiceOut, 200)

    const expectedId = 42
    collaboratorsServiceOut.messageSource =
        collaboratorsServiceIn.onMsgToBroadcast
            .map((msg: BroadcastMessage): NetworkMessage => {
                return new NetworkMessage(msg.service, expectedId, true, msg.content)
            })

    const pseudos = ["Hello", "There,", "How", "Are", "You?"]
    setTimeout(() => {
        collaboratorsServiceIn.pseudoSource = Observable.from(pseudos)
    }, 0)

    t.plan(pseudos.length * 2)
    let counter = 0
    return collaboratorsServiceOut.onCollaboratorChangePseudo
        .map((collaborator: Collaborator): void => {
            const expectedPseudo = pseudos[counter]
            t.is(collaborator.id, expectedId)
            t.is(collaborator.pseudo, expectedPseudo)

            counter++
        })
})

test("peers-joining-correct-delivery", (t: TestContext) => {
    const collaboratorsService = new CollaboratorsService()
    disposeOf(collaboratorsService, 200)

    const expectedIds = [0, 1, 7, 42, 80]
    setTimeout(() => {
        collaboratorsService.peerJoinSource = Observable.from(expectedIds)
    }, 0)

    t.plan(expectedIds.length * 2)
    let counter = 0
    return collaboratorsService.onCollaboratorJoin
        .map((collaborator: Collaborator): void => {
            const expectedId = expectedIds[counter]
            t.is(collaborator.id, expectedId)
            t.is(collaborator.pseudo, CollaboratorsService.DEFAULT_PSEUDO)

            counter++
        })
})

test("send-pseudo-to-joining-peer", (t: TestContext) => {
    const collaboratorsService = new CollaboratorsService()
    disposeOf(collaboratorsService, 200)

    const expectedId = 7
    setTimeout(() => {
        collaboratorsService.peerJoinSource = Observable.from([expectedId])
    }, 0)

    t.plan(1)
    return collaboratorsService.onMsgToSendTo
        .map((msg: SendToMessage): void => {
            t.is(msg.id, expectedId)
        })
})