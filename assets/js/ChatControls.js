import DataChat from "./DataChat.js"
import { Element } from "./Element.js"
import { BlockChat } from "./components/BlockChat.js"
import { LoginForm } from "./components/LoginForm.js"
import { SignupForm } from "./components/SignupForm.js"
import { UploadForm } from "./components/UploadForm.js"

export class ChatControls extends Element
{
    chatBubble = null
    currentFn = null
    currentArgs = ''

    constructor(app, props)
    {
        super('div', {class: 'input'})
        this.props = props
        this.model = this.props.model
        this.app = app
        this.storage = window.localStorage;
        
        this.status = new Element('div', '', {class: 'status-message'}).add(this.root)
        const form = new Element('form').add(this.root)
        this.text = new Element('textarea', {input: this.autoExpand.bind(this), blur: this.autoShrink.bind(this), focus: this.autoExpand.bind(this), click: this.cursorToEnd.bind(this)}).add(form)
        this.sendBtn = new Element('button', '<i class="fa-solid fa-paper-plane"></i>', {click: this.onNewMessage.bind(this)}).add(form)
    }

    async clearStatusMessage()
    {
        this.status.setHTML('')
        this.text.getRoot().disabled = false;
        this.sendBtn.getRoot().disabled = false;
        this.text.getRoot().focus()
    }

    async setStatusMessage(message)
    {
        this.text.getRoot().disabled = true;
        this.sendBtn.getRoot().disabled = true;
        this.status.setHTML('<div class="chat-type-bubble"><div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>')
    }

    async send(message, type='client')
    {
        this.setStatusMessage('Your AI assistant is typing...')

        if(this.props && this.props.onNewMessage) this.props.onNewMessage(type, message)

        this.text.getRoot().value = ''
        this.text.getRoot().focus();

        gtag("event", "chat", {
            method: "chat-send"
        });
        
        const returnMessage = await this.model.send(message, this.onReceiveMessage.bind(this), type)

    }

    async onReceiveMessage(e, es)
    {

        console.log('-' + e.data)

        if(e.data == '[DONE]'){
            
            if(this.currentFn){
                this.currentArgs = JSON.stringify(this.currentArgs)
                this.currentArgs = JSON.parse(this.currentArgs)
                console.log("function call", this.currentFn, this.currentArgs)
                switch(this.currentFn){
                    case 'presentSignupForm':
                        if(!this.chatBubble) this.chatBubble = this.props.onNewMessage('assistant', '')
                        new SignupForm(this.app, this, this.currentArgs).add(this.chatBubble.content)
                        break;
                    case 'presentLoginForm':
                        if(!this.chatBubble) this.chatBubble = this.props.onNewMessage('assistant', '')
                        new LoginForm(this.app, this, this.currentArgs).add(this.chatBubble.content)
                        break;
                    case 'presentUploadForm':
                        if(!this.chatBubble) this.chatBubble = this.props.onNewMessage('assistant', '')
                        new UploadForm(this.app, this, {...this.currentArgs, ...{controls: this}}).add(this.chatBubble.content)
                        break;
                    case 'blockChat':
                        this.storage.setItem('isBlocked', true)
                        if(!this.chatBubble) this.chatBubble = this.props.onNewMessage('assistant', '')
                        new BlockChat(this.app, this, {...this.currentArgs, ...{controls: this}}).add(this.chatBubble.content)
                        this.remove();
                        break;
                }

            }
            this.currentFn = null;
            this.currentArgs = '';
            
            this.chatBubble = null
            
            return
        }

        if(e.data == '[DISCONNECT]'){
            this.clearStatusMessage()
            this.chatBubble = null
            es.close()
            return
        }

        const message = JSON.parse(e.data)

        if(message && message.choices && message.choices.length > 0 && message.choices[0].delta && message.choices[0].delta.tool_calls ){
            
            if(message.choices[0].delta.tool_calls[0].function.name) this.currentFn = message.choices[0].delta.tool_calls[0].function.name
            this.currentArgs += message.choices[0].delta.tool_calls[0].function.arguments
        }

        if(message && message.choices && message.choices.length > 0 && message.choices[0].delta && message.choices[0].delta.content){
            if(!this.chatBubble && message.choices[0].delta.content != '') this.chatBubble = this.props.onNewMessage('assistant', '')
            this.chatBubble.content.getRoot().innerHTML += message.choices[0].delta.content
            this.chatBubble.conversationWindow.getRoot().scrollTop = this.chatBubble.conversationWindow.getRoot().scrollHeight;
        }

        if(message && message.choices && message.choices.length > 0 && message.choices[0].delta && message.choices[0].delta.chat_type_id){
            this.model.type = message.choices[0].delta.chat_type_id
            this.app.caseNav.activateAssistant(message.choices[0].delta.chat_type_id)
        }
        
    }

    async onNewMessage(e)
    {
        e.preventDefault()
        e.stopPropagation()

        const message = this.text.getRoot().value

        let ai = 'unknown'
        const ais = ['unknown', 'sign-up', 'builder', 'generic', 'accident', 'injuries', 'treatments', 'damages', 'insurance', 'claims', 'settlement']
        if(ais[this.model.type]) ai = ais[this.model.type]
        
        this.send(message)
    }

    autoExpand() {
        this.text.getRoot().style.height = this.text.getRoot().scrollHeight + 'px';
    }

    autoShrink() {
        this.text.getRoot().style.height = '45px';
    }

    cursorToEnd() {
        // Move the cursor to the end of the existing text in the text area
        this.text.getRoot().selectionStart = this.text.getRoot().selectionEnd = this.text.getRoot().value.length;
    }
      
}