import { Observable, Subject } from 'rxjs'

import { BroadcastMessage, SendRandomlyMessage, SendToMessage, MessageEmitter, NetworkMessage } from '../network/'
import { Collaborator } from './Collaborator'
import { CollaboratorMsg } from '../../proto/collaborator_pb'

export class CollaboratorsService implements MessageEmitter {

  private static ID: string = 'Collaborators'

  private pseudonym: string

  private collaboratorChangePseudoSubject: Subject<Collaborator>
  private collaboratorJoinSubject: Subject<Collaborator>
  private collaboratorLeaveSubject: Subject<number>

  private disposeSubject: Subject<void>

  private msgToBroadcastSubject: Subject<BroadcastMessage>
  private msgToSendRandomlySubject: Subject<SendRandomlyMessage>
  private msgToSendToSubject: Subject<SendToMessage>

  constructor () {
    this.collaboratorChangePseudoSubject = new Subject()
    this.collaboratorJoinSubject = new Subject()
    this.collaboratorLeaveSubject = new Subject()
    this.disposeSubject = new Subject()
    this.msgToBroadcastSubject = new Subject()
    this.msgToSendRandomlySubject = new Subject()
    this.msgToSendToSubject = new Subject()
  }

  get onCollaboratorChangePseudo (): Observable<Collaborator> {
    return this.collaboratorChangePseudoSubject.asObservable()
  }

  get onCollaboratorJoin (): Observable<Collaborator> {
    return this.collaboratorJoinSubject.asObservable()
  }

  get onCollaboratorLeave (): Observable<number> {
    return this.collaboratorLeaveSubject.asObservable()
  }

  get onMsgToBroadcast (): Observable<BroadcastMessage> {
    return this.msgToBroadcastSubject.asObservable()
  }

  get onMsgToSendRandomly (): Observable<SendRandomlyMessage> {
    return this.msgToSendRandomlySubject.asObservable()
  }

  get onMsgToSendTo (): Observable<SendToMessage> {
    return this.msgToSendToSubject.asObservable()
  }

  set leaveSource (source: Observable<void>) {}

  set messageSource (source: Observable<NetworkMessage>) {
    source
      .takeUntil(this.disposeSubject)
      .filter((msg: NetworkMessage) => msg.service === CollaboratorsService.ID)
      .subscribe((msg: NetworkMessage) => {
        const collabMsg = CollaboratorMsg.decode(msg.content)
        const id: number = msg.id
        const pseudo: string = collabMsg.pseudo
        this.collaboratorChangePseudoSubject.next(new Collaborator(id, pseudo))
      })
  }

  set peerJoinSource (source: Observable<number>) {
    source
      .takeUntil(this.disposeSubject)
      .subscribe((id: number) => {
        this.emitPseudo(this.pseudonym, id)
        this.collaboratorJoinSubject.next(new Collaborator(id, 'Anonymous'))
      })
  }

  set peerLeaveSource (source: Observable<number>) {
    source
      .takeUntil(this.disposeSubject)
      .subscribe((id: number) => {
        this.collaboratorLeaveSubject.next(id)
      })
  }

  set pseudoSource (source: Observable<String>) {
    source
      .takeUntil(this.disposeSubject)
      .subscribe((pseudo: string) => {
        this.pseudonym = pseudo
        this.emitPseudo(pseudo)
      })
  }

  emitPseudo (pseudo: string, id?: number): Uint8Array {
    const collabMsg = CollaboratorMsg.create({pseudo})

    if (id) {
      const msg: SendToMessage = new SendToMessage(CollaboratorsService.ID, id, CollaboratorMsg.encode(collabMsg).finish())
      this.msgToSendToSubject.next(msg)
    } else {
      const msg: BroadcastMessage = new BroadcastMessage(CollaboratorsService.ID, CollaboratorMsg.encode(collabMsg).finish())
      this.msgToBroadcastSubject.next(msg)
    }
    return CollaboratorMsg.encode(collabMsg).finish()
  }

  clean (): void {
    this.collaboratorChangePseudoSubject.complete()
    this.collaboratorJoinSubject.complete()
    this.collaboratorLeaveSubject.complete()
    this.disposeSubject.complete()
    this.msgToBroadcastSubject.complete()
    this.msgToSendRandomlySubject.complete()
    this.msgToSendToSubject.complete()
  }

}
