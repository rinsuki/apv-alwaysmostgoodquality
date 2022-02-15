browser.webRequest.onBeforeRequest.addListener(details => {
    const decoder = new TextDecoder("UTF-8")
    const encoder = new TextEncoder()
    const filter = browser.webRequest.filterResponseData(details.requestId)
    let str = ""
    filter.ondata = event => {
        str += decoder.decode(event.data, { stream: true })
    }
    filter.onstop = () => {
        console.log(str)
        const parser = new DOMParser()
        const dom = parser.parseFromString(str, "application/xml")
        for (const adaptionSet of dom.querySelectorAll(`AdaptationSet[contentType=video]`)) {
            const reprs = adaptionSet.querySelectorAll("Representation")
            let mostGoodRepr
            for (const repr of reprs) {
                const r = {
                    dom: repr,
                    bandwidth: parseInt(repr.getAttribute("bandwidth"), 10),
                    resolution: parseInt(repr.getAttribute("width"), 10) * parseInt(repr.getAttribute("height"), 10),
                }
                if (mostGoodRepr == null) {
                    mostGoodRepr = r
                } else if (mostGoodRepr.resolution < r.resolution) {
                    mostGoodRepr = r
                } else if (mostGoodRepr.resolution > r.resolution) {
                    continue
                } else if (mostGoodRepr.bandwidth < r.bandwidth) {
                    mostGoodRepr = r
                }
            }
            for (const repr of reprs) {
                if (mostGoodRepr.dom !== repr) repr.remove()
            }
        }
        filter.write(encoder.encode(new XMLSerializer().serializeToString(dom)))
        filter.disconnect()
    }
}, {
    urls: ["https://*.aiv-cdn.net/*.mpd*"],
}, ["blocking"])