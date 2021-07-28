var faqList = document.querySelectorAll('.faqList li')
var faqListTitle = document.querySelectorAll('.faqList .title')
faqList.forEach(function(thisDom) {
    thisDom.onclick = function(everyDom) {
        faqList.forEach(function(e) {
            e.className = ''
        })
        everyDom.stopPropagation();
        thisDom.className = 'current'
    }
})
faqListTitle.forEach(function(listItem) {
    listItem.onclick = function(e) {
        if (listItem.parentNode.className === 'current') {
            faqList.forEach(function(dom) {
                dom.className = ''
            })
            e.stopPropagation();
        }
    }
})