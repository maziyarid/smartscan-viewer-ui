//determine the location of teeth modal on screen
let position = {}
let currentPosition = {
    Top: null,
    Left: null
}
//Get data from Model
$(document).ready(function () {
    //Ajax call to get the data
    let allContent = {};
    let site_name = $(".teeth-modal").data("site-name");

    function GetOmfrReport(patientID) {
        let url;
        let subDomain = $(".teeth-modal").data("sub-domain");

        if (subDomain) {
            url = "/" + subDomain + "/GetOmfrReport"
        }
        else {
            url = "/GetOmfrReport"
        }

        $.ajax({
            url: url,
            method: "GET",
            data: {
                patientID,
                siteName: site_name
            },
            beforeSend: function () {
                swal.fire({
                    allowEscapeKey: false,
                    title: "لطفا صبر کنید",
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        swal.showLoading();
                    }
                })
                $("body").removeClass("swal2-shown").removeClass("swal2-height-auto");
            },
            success: function (response) {
                swal.close();
                if (response.successMsg) {
                    allContent = JSON.parse(response.successMsg)
                    if (JSON.parse(response.position) != null) {
                        position = JSON.parse(response.position)
                        if (currentPosition.Top == null || currentPosition.Left == null) {
                            //if (window.screen.width > 768 && !isMobile() ) {
                            if (window.screen.width > 768 && !isMobile() ) {
                                $(".teeth-modal").css("top", `${position.Top}px`)
                                $(".teeth-modal").css("left", `${position.Left}px`)
                            }
                        } else {
                            //if (window.screen.width > 768 && !isMobile()) {
                            if (window.screen.width > 768 && !isMobile()) {
                                $(".teeth-modal").css("top", `${currentPosition.Top}px`)
                                $(".teeth-modal").css("left", `${currentPosition.Left}px`)
                            }
                        }
                        if (parseInt($(".teeth-modal").css("top").split("px")[0]) < 98) {
                            document.querySelector(".menu-modal").style.top = "235px"
                        }
                    }
                    $("#teethModal").css("display", "block");
                    SetOmfrReportToView()
                }
                else if (response.errorMsg) {
                    Swal.fire({
                        title: "خطا",
                        text: response.errorMsg,
                        icon: "error",
                        timer: 2000,
                        showConfirmButton: false,
                    });
                    $("#teethButton").css("background-color" , "#fff")
                    $("body").removeClass("swal2-shown").removeClass("swal2-height-auto");
                }
                else {
                    window.location = response.redirectURL
                }
            }
        })
    }
    $(window).on("resize", function () {
        let elementWidth = $("#teethModal")[0].clientWidth
        let left = parseInt($("#teethModal").css("left").replace("px", ""))
        if ((window.screen.width - left) < (elementWidth / 2)) {
            let newLeft = (window.screen.width - (elementWidth / 2)) + "px"           
            $("#teethModal").css("left" , newLeft)
        }
    })

    function isMobile() {
        const regex = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        return regex.test(navigator.userAgent);
    }

    function SetOmfrReportToView() {
        //console.log(allContent)
        let content = allContent.report
        //get all data comments
        if (content.cariesComment != null && content.cariesComment.length > 0) {
            $("#caries-comment-holder").val(content.cariesComment)
            $("#caries-comment-svg").css("fill", "#27ff00")
        }
        if (content.periaComment != null && content.periaComment.length > 0) {
            $("#periapical-comment-holder").val(content.periaComment)
            $("#periapical-comment-svg").css("fill", "#27ff00")
        }
        if (content.perioComment != null && content.perioComment.length > 0) {
            $("#periodontal-comment-holder").val(content.perioComment)
            $("#periodontal-comment-svg").css("fill", "#27ff00")
        }
        if (content.misComment != null && content.misComment.length > 0) {
            $("#missing-comment-holder").val(content.misComment)
            $("#missing-comment-svg").css("fill", "#27ff00")
        }
        if (content.remComment != null && content.remComment.length > 0) {
            $("#remained-comment-holder").val(content.remComment)
            $("#remained-comment-svg").css("fill", "#27ff00")
        }
        if (content.imptComment != null && content.imptComment.length > 0) {
            $("#impacted-comment-holder").val(content.imptComment)
            $("#impacted-comment-svg").css("fill", "#27ff00")
        }
        if (content.OtherProblem != null && content.OtherProblem.length > 0) {
            $("#problems-comment-holder").val(content.OtherProblem)
            $("#problems-comment-svg").css("fill", "#27ff00")
        }
        for (let i = 0; content.PermanentTeethInfo != null && i < content.PermanentTeethInfo.length; i++) {

            const report = content.PermanentTeethInfo[i]
            const teethNum = content.PermanentTeethInfo[i].teethNo
            let selectedTooth = $(".periapical").find(`#${teethNum}`)
            if (report.periA == 1) {
                $(selectedTooth).prevAll(".periapical-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "پری اپیکال")
                sortBar()
            }
            if (report.perD == 1) {
                $(selectedTooth).prevAll(".periodontal-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "پریودنتال")
                sortBar()
            }
            if (report.mis == 1) {
                $(selectedTooth).prevAll(".tgl").prop("checked", true)
                $(selectedTooth).css("color", "red")
                createBar(selectedTooth, "غایب")
                sortBar()
            }
            if (report.remR == 1) {
                $(selectedTooth).prevAll(".roots-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "ریشه باقیمانده")
                sortBar()
            }
            if (report.ImpT == 1) {
                $(selectedTooth).prevAll(".impacted-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "دندان نهفته")
                sortBar()
            }
            if (report.Caries != null && (report.Caries.dis == 1)) {
                $(selectedTooth).prevAll(".D-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "D")
                sortBar()
            }
            if (report.Caries != null && report.Caries.dis_E == 1) {
                $(selectedTooth).prevAll(".D-e-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "D(e)")
                sortBar()
            }
            if (report.Caries != null && report.Caries.dis_R == 1) {
                $(selectedTooth).prevAll(".D-r-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "D(r)")
                sortBar()
            }
            if (report.Caries != null && report.Caries.dis_i == 1) {
                $(selectedTooth).prevAll(".D-i-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "D(i)")
                sortBar()
            }
            if (report.Caries != null && report.Caries.dis_Q == 1) {
                $(selectedTooth).prevAll(".D-q-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "D(?)")
                sortBar()
            }
            if (report.Caries != null && report.Caries.mes == 1) {
                $(selectedTooth).prevAll(".M-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "M")
                sortBar()
            }
            if (report.Caries != null && report.Caries.mes_E == 1) {
                $(selectedTooth).prevAll(".M-e-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "M(e)")
                sortBar()
            }
            if (report.Caries != null && report.Caries.mes_R == 1) {
                $(selectedTooth).prevAll(".M-r-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "M(r)")
                sortBar()
            }
            if (report.Caries != null && report.Caries.mes_i == 1) {
                $(selectedTooth).prevAll(".M-i-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "M(i)")
                sortBar()
            }
            if (report.Caries != null && report.Caries.mes_Q == 1) {
                $(selectedTooth).prevAll(".M-q-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "M(?)")
                sortBar()
            }
            if (report.Caries != null && report.Caries.o == 1) {
                $(selectedTooth).prevAll(".O-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "O")
                sortBar()
            }
            if (report.Caries != null && report.Caries.c == 1) {
                $(selectedTooth).prevAll(".C-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "C")
                sortBar()
            }
            if (report.Caries != null && report.Caries.B == 1) {
                $(selectedTooth).prevAll(".B-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "B")
                sortBar()
            }
            if (report.Caries != null && report.Caries.L == 1) {
                $(selectedTooth).prevAll(".L-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "L")
                sortBar()
            }
            if (report.Caries != null && report.Caries.G == 1) {
                $(selectedTooth).prevAll(".G-holder").prop("checked", true)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, "G")
                sortBar()
            }
            if (report.Caries != null && report.Caries.Desc != null && report.Caries.Desc !== "") {
                $(selectedTooth).prevAll(".Desc-holder").val(report.Caries.Desc)
                $(selectedTooth).css({ "color": "#142dff" })
                createBar(selectedTooth, report.Caries.Desc)
                sortBar()
            }
        }
    }
    //Post content with Ajax
    $(".save").on("click", function () {
        //let allContent = $(".teeth-modal").data("content")
        generateDatasToShow()
        let contentList = allContent.report;
        contentList.cariesComment = $("#caries-comment-holder").val();
        contentList.periaComment = $("#periapical-comment-holder").val();
        contentList.perioComment = $("#periodontal-comment-holder").val();
        contentList.misComment = $("#missing-comment-holder").val();
        contentList.remComment = $("#remained-comment-holder").val();
        contentList.imptComment = $("#impacted-comment-holder").val();
        contentList.OtherProblem = $("#problems-comment-holder").val();

        contentList.PermanentTeethInfo = [];
        $(".missing-info").prevAll(".tooth").each(function () {
            let object = {
                Caries: {}
            }
            object.teethNo = $(this).attr("id");
            object.mis = $(this).prevAll(".tgl").is(":checked") ? 1 : 0;
            object.perD = $(this).prevAll(".periodontal-holder").is(":checked") ? 1 : 0;
            object.periA = $(this).prevAll(".periapical-holder").is(":checked") ? 1 : 0;
            object.remR = $(this).prevAll(".roots-holder").is(":checked") ? 1 : 0;
            object.ImpT = $(this).prevAll(".impacted-holder").is(":checked") ? 1 : 0;
            object.Caries.dis = $(this).prevAll(".D-holder").is(":checked") ? 1 : 0;
            object.Caries.dis_E = $(this).prevAll(".D-e-holder").is(":checked") ? 1 : 0;
            object.Caries.dis_R = $(this).prevAll(".D-r-holder").is(":checked") ? 1 : 0;
            object.Caries.dis_i = $(this).prevAll(".D-i-holder").is(":checked") ? 1 : 0;
            object.Caries.dis_Q = $(this).prevAll(".D-q-holder").is(":checked") ? 1 : 0;
            object.Caries.mes = $(this).prevAll(".M-holder").is(":checked") ? 1 : 0;
            object.Caries.mes_E = $(this).prevAll(".M-e-holder").is(":checked") ? 1 : 0;
            object.Caries.mes_R = $(this).prevAll(".M-r-holder").is(":checked") ? 1 : 0;
            object.Caries.mes_i = $(this).prevAll(".M-i-holder").is(":checked") ? 1 : 0;
            object.Caries.mes_Q = $(this).prevAll(".M-q-holder").is(":checked") ? 1 : 0;
            object.Caries.o = $(this).prevAll(".O-holder").is(":checked") ? 1 : 0;
            object.Caries.c = $(this).prevAll(".C-holder").is(":checked") ? 1 : 0;
            object.Caries.B = $(this).prevAll(".B-holder").is(":checked") ? 1 : 0;
            object.Caries.L = $(this).prevAll(".L-holder").is(":checked") ? 1 : 0;
            object.Caries.G = $(this).prevAll(".G-holder").is(":checked") ? 1 : 0;
            object.Caries.Desc = $(this).prevAll(".Desc-holder").val() == "" ? "" : $(this).prevAll(".Desc-holder").val();
            contentList.PermanentTeethInfo.push(object);
        })

        allContent.report = contentList;
        let url;
        let subDomain = $(".teeth-modal").data("sub-domain");
        //position
        if (currentPosition.Top == null || currentPosition.Left == null) {
            currentPosition.Top =  parseInt($("#teethModal").css("top").split("px")[0])
            currentPosition.Left = parseInt($("#teethModal").css("left").split("px")[0])
        } 
        position = currentPosition
        if (subDomain) {
            url = "/" + subDomain + "/SaveOmfrReport"
        }
        else {
            url = "/SaveOmfrReport"
        }
        $.ajax({
            method: "POST",
            url: url,
            data: {
                position,
                siteName: site_name,
                omfrReportResult: allContent,
                __RequestVerificationToken: $('input[name="__RequestVerificationToken"]').val()
            },
            beforeSend: function () {
                swal.fire({
                    allowEscapeKey: false,
                    title: "لطفا صبر کنید",
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        swal.showLoading();
                    }
                })
                $("body").removeClass("swal2-shown").removeClass("swal2-height-auto");
            },
            success: function (response) {
                swal.close()
                if (response.successMsg) {
                    Swal.fire({
                        text: response.successMsg,
                        icon: "success",
                        showConfirmButton : false
                        //confirmButtonText: "تایید",
                        //confirmButtonColor: "#343a40",
                    });
                    $("body").removeClass("swal2-shown").removeClass("swal2-height-auto");
                    $(".menu-modal").trigger("reset")
                    $("#teethModal").css("display", "none");
                    $("#teethButton").css("background-color", "#fff");
                    window.location.reload()
                }
                else if (response.errorMsg) {
                    Swal.fire({
                        title: "خطا",
                        text: response.errorMsg,
                        icon: "error",
                        timer: 2000,
                        showConfirmButton: false,
                    });
                    $("body").removeClass("swal2-shown").removeClass("swal2-height-auto");
                }
                else {
                    $("#teethModal").css("display", "none");
                    $("#teethButton").css("background-color", "#fff");
                    window.location = response.redirectURL
                }
            },
        })
    })


    let last_selected_tooth;
    let kidHeightUp = 20;
    let kidHeightDown = 20;
    let adultHeightUpLeft = 20;
    let adultHeightUpRight = 20;
    let adultHeightDownLeft = 20;
    let adultHeightDownRight = 20;
    let patientID = $("#teethModal").data("patient-id")
    $("#teethButton").on("click", function () {
        $(this).css("background-color", "#ffd800");
        GetOmfrReport(patientID);
    })

    $(".close-modal").on("click", function () {
        $("#teethModal").css("display", "none");
        $("#teethButton").css("background-color", "#fff")
    })
    //onClick event for comment buttons

    //caries comment tab
    $(".caries-comment-tab").on("click", function () {
        $(".menu-modal , .textarea-comment-holders").css("display", "flex")
        $(".form-check-list , .textarea-container").hide()
        $(".textarea-comment-holders div").hide()
        $(".caries-textarea").css("display", "flex")
        $(this).find(".comment-svg").css("fill", "#ffd800")
    })
    //missing comment tab
    $(".missing-comment-tab").on("click", function () {
        $(".menu-modal , .textarea-comment-holders").css("display", "flex")
        $(".form-check-list , .textarea-container").hide()
        $(".textarea-comment-holders div").hide()
        $(".missing-textarea").css("display", "flex")
        $(this).find(".comment-svg").css("fill", "#ffd800")
    })
    //periapical comment tab
    $(".periapical-comment-tab").on("click", function () {
        $(".menu-modal , .textarea-comment-holders").css("display", "flex")
        $(".form-check-list , .textarea-container").hide()
        $(".textarea-comment-holders div").hide()
        $(".periapical-textarea").css("display", "flex")
        $(this).find(".comment-svg").css("fill", "#ffd800")
    })
    //periodontaal comment tab
    $(".periodontal-comment-tab").on("click", function () {
        $(".menu-modal , .textarea-comment-holders").css("display", "flex")
        $(".form-check-list , .textarea-container").hide()
        $(".textarea-comment-holders div").hide()
        $(".periodontal-textarea").css("display", "flex")
        $(this).find(".comment-svg").css("fill", "#ffd800")
    })
    //impacted comment tab
    $(".impacted-comment-tab").on("click", function () {
        $(".menu-modal , .textarea-comment-holders").css("display", "flex")
        $(".form-check-list , .textarea-container").hide()
        $(".textarea-comment-holders div").hide()
        $(".impacted-textarea").css("display", "flex")
        $(this).find(".comment-svg").css("fill", "#ffd800")
    })
    //remained comment tab
    $(".remained-comment-tab").on("click", function () {
        $(".menu-modal , .textarea-comment-holders").css("display", "flex")
        $(".form-check-list , .textarea-container").hide()
        $(".textarea-comment-holders div").hide()
        $(".remained-textarea").css("display", "flex")
        $(this).find(".comment-svg").css("fill", "#ffd800")
    })
    //problems comment tab
    $(".problems-comment-tab").on("click", function () {
        $(".menu-modal , .textarea-comment-holders").css("display", "flex")
        $(".form-check-list , .textarea-container").hide()
        $(".textarea-comment-holders div").hide()
        $(".problems-textarea").css("display", "flex")
        $(this).find(".comment-svg").css("fill", "#ffd800")
    })


    function sortBar() {
        let heightsTopKid = []
        let heightsBottomKid = []
        let heightsTopRight = []
        let heightsTopLeft = []
        let heightsBottomRight = []
        let heightsBottomLeft = []
        //periapical Kid Top
        $(".periapical-kid .periapical-kids-up .missing-info").each(function (index) {
            heightsTopKid.push($(this).height())
        })
        heightsTopKid.sort(function (a, b) { return b - a })
        $(".periapical-kid .periapical-kids-up .missing-info").each(function (index) {
            $(this).css("height", `${heightsTopKid[index]}px`)
            $(this).css("top", `-${heightsTopKid[index]}px`)
        })
        //periapical Kid bottom
        $(".periapical-kid .periapical-kids-down .missing-info").each(function () {
            let editedHeight = parseInt($(this).css("height").split("px")[0])
            heightsBottomKid.push(editedHeight)
        })
        heightsBottomKid.sort(function (a, b) { return b - a })
        $(".periapical-kid .periapical-kids-down .missing-info").each(function (index) {
            $(this).css("height", `${heightsBottomKid[index]}px`)
            $(this).css("bottom", `-${heightsBottomKid[index]}px`)
            $(this).css("padding-top", `${heightsBottomKid[index] - 11}px`)
        })
        //periapical adult Top Right
        $(".periapical-adult .periapical-up-right .missing-info").each(function (index) {
            heightsTopRight.push($(this).height())
        })
        heightsTopRight.sort(function (a, b) { return b - a })
        $(".periapical-adult .periapical-up-right .missing-info").each(function (index) {
            $(this).css("height", `${heightsTopRight[index]}px`)
            $(this).css("top", `-${heightsTopRight[index]}px`)
        })
        //periapical adult Top Left
        $(".periapical-adult .periapical-up-left .missing-info").each(function (index) {
            heightsTopLeft.push($(this).height())
        })
        heightsTopLeft.sort(function (a, b) { return b - a })
        $(".periapical-adult .periapical-up-left .missing-info").each(function (index) {
            $(this).css("height", `${heightsTopLeft[index]}px`)
            $(this).css("top", `-${heightsTopLeft[index]}px`)
        })
        //periapical adult bottom Right
        $(".periapical-adult .periapical-down-right .missing-info").each(function () {
            let editedHeight = parseInt($(this).css("height").split("px")[0])
            heightsBottomRight.push(editedHeight)
        })
        heightsBottomRight.sort(function (a, b) { return b - a })
        $(".periapical-adult .periapical-down-right .missing-info").each(function (index) {
            $(this).css("height", `${heightsBottomRight[index]}px`)
            $(this).css("bottom", `-${heightsBottomRight[index]}px`)
            $(this).css("padding-top", `${heightsBottomRight[index] - 11}px`)
        })
        //periapical adult bottom Left
        $(".periapical-adult .periapical-down-left .missing-info").each(function (index) {
            let editedHeight = parseInt($(this).css("height").split("px")[0])
            heightsBottomLeft.push(editedHeight)
        })
        heightsBottomLeft.sort(function (a, b) { return b - a })
        $(".periapical-adult .periapical-down-left .missing-info").each(function (index) {
            $(this).css("height", `${heightsBottomLeft[index]}px`)
            $(this).css("bottom", `-${heightsBottomLeft[index]}px`)
            $(this).css("padding-top", `${heightsBottomLeft[index] - 11}px`)
        })
    }
    //holder is a teeth that we clicked
    let is_Caries = false
    let is_M = false
    let is_D = false
    let cariesCount = 0
    let cariesContainer
    function createBar(holder, barname) {
        if (holder.nextAll(".missing-info").find(`span:contains(${barname})`).length > 0) return
        cariesCheck(holder, barname)
        if (cariesCount > 0 && is_Caries) {
            cariesContainer.append($(`<span style="color:#c3c3c3;white-space:nowrap">${barname}</span>`));
            if (holder.nextAll(".missing-info").find("span:contains(M)").length > 0 && is_M) {
                holder.nextAll(".missing-info").find("span:contains(M)")[0].remove()
            }
            if (holder.nextAll(".missing-info").find("span:contains(D)").length > 0 && is_D) {
                holder.nextAll(".missing-info").find("span:contains(D)")[0].remove()
            }
            cariesCount = 0
        } else {
            const div = $("<div>").addClass("missing-info").append($('<span style="color:#c3c3c3;white-space:nowrap">').text(barname));
            div.css({
                borderLeft: "2px solid #c3c3c3",
                paddingLeft: '2px',
                position: "absolute",
                color: "#c3c3c3",
                left: "11px",
                fontSize: "10px"
            })
            if (holder.closest(".periapical-kids-up").length > 0) {
                div.css("height", `${kidHeightUp}px`).css("top", `-${kidHeightUp}px`);
                kidHeightUp += 20;
            }
            else if (holder.closest(".periapical-kids-down").length > 0) {
                div.css("height", `${kidHeightDown}px`).css("bottom", `-${kidHeightDown}px`).css("paddingTop", `${kidHeightDown - 11}px`);
                kidHeightDown += 20;
            }
            else if (holder.closest(".periapical-up").length > 0) {
                if (holder.closest(".periapical-up-right").length > 0) {
                    div.css("height", `${adultHeightUpRight}px`).css("top", `-${adultHeightUpRight}px`);
                    adultHeightUpRight += 20;
                } else {
                    div.css("height", `${adultHeightUpLeft}px`).css("top", `-${adultHeightUpLeft}px`);
                    adultHeightUpLeft += 20;
                }
            }
            else {
                if (holder.closest(".periapical-down-right").length > 0) {
                    div.css("height", `${adultHeightDownRight}px`).css("bottom", `-${adultHeightDownRight}px`).css("padding-top", `${adultHeightDownRight - 11}px`);
                    adultHeightDownRight += 20;
                } else {
                    div.css("height", `${adultHeightDownLeft}px`).css("bottom", `-${adultHeightDownLeft}px`).css("padding-top", `${adultHeightDownLeft - 11}px`);
                    adultHeightDownLeft += 20;
                }
            }
            holder.parent().append(div);
        }
    }

    function cariesCheck(holder, barname) {
        const cariesArray = ["M", "D", "O", "C", "L", "B", "G", "M(e)", "M(r)", "M(i)", "M(?)", "D(e)", "D(r)", "D(i)", "D(?)"];
        const arrayofM = ["M(r)", "M(i)", "M(e)", "M(?)"];
        const arrayofD = ["D(r)", "D(i)", "D(e)", "D(?)"];

        is_Caries = cariesArray.includes(barname);
        is_M = arrayofM.includes(barname);
        is_D = arrayofD.includes(barname);

        cariesArray.forEach(item => {
            if (holder.nextAll(".missing-info").find(`span:contains(${item})`).length > 0) {
                cariesCount++
                cariesContainer = holder.nextAll(".missing-info").find(`span:contains(${item})`).parent();
            }
        })
    }
    function generateDatasToShow() {
        //Desc
        $(".active-tab").prevAll(".Desc-holder").each(function () {
            if ($(this).val().length > 0) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), $(this).val())
                sortBar()
            }
        })
        //M
        $(".active-tab").prevAll(".M-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".M-e-holder").is(":checked")) return
                if ($(this).nextAll(".M-r-holder").is(":checked")) return
                if ($(this).nextAll(".M-i-holder").is(":checked")) return
                if ($(this).nextAll(".M-q-holder").is(":checked")) return
                createBar($(this), "M")
                sortBar()
            }
        })
        //Me
        $(".active-tab").prevAll(".M-e-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".missing-info").find(`span:contains("M")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(r)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(r)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(i)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(i)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(?)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(?)")`).closest(".missing-info").remove()
                createBar($(this), "M(e)")
                sortBar()
            }
        })
        //Mr
        $(".active-tab").prevAll(".M-r-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".missing-info").find(`span:contains("M")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(e)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(e)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(i)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(i)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(?)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(?)")`).closest(".missing-info").remove()
                createBar($(this), "M(r)")
                sortBar()
            }
        })
        //Mi
        $(".active-tab").prevAll(".M-i-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".missing-info").find(`span:contains("M")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(e)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(e)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(r)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(r)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(?)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(?)")`).closest(".missing-info").remove()
                createBar($(this), "M(i)")
                sortBar()
            }
        })
        //Mq
        $(".active-tab").prevAll(".M-q-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".missing-info").find(`span:contains("M")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(e)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(e)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(i)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(i)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("M(r)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("M(r)")`).closest(".missing-info").remove()
                createBar($(this), "M(?)")
                sortBar()
            }
        })
        //D
        $(".active-tab").prevAll(".D-holder").each(function () {
            if ($(this).is(":checked")) {
                if ($(this).nextAll(".D-e-holder").is(":checked")) return
                if ($(this).nextAll(".D-r-holder").is(":checked")) return
                if ($(this).nextAll(".D-i-holder").is(":checked")) return
                if ($(this).nextAll(".D-q-holder").is(":checked")) return
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "D")
                sortBar()
            }
        })
        //De
        $(".active-tab").prevAll(".D-e-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".missing-info").find(`span:contains("D")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(r)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(r)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(i)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(i)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(?)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(?)")`).closest(".missing-info").remove()
                createBar($(this), "D(e)")
                sortBar()
            }
        })
        //Dr
        $(".active-tab").prevAll(".D-r-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".missing-info").find(`span:contains("D")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(e)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(e)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(i)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(i)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(?)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(?)")`).closest(".missing-info").remove()
                createBar($(this), "D(r)")
                sortBar()
            }
        })
        //Di
        $(".active-tab").prevAll(".D-i-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".missing-info").find(`span:contains("D")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(e)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(e)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(r)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(r)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(?)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(?)")`).closest(".missing-info").remove()
                createBar($(this), "D(i)")
                sortBar()
            }
        })
        //Dq
        $(".active-tab").prevAll(".D-q-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                if ($(this).nextAll(".missing-info").find(`span:contains("D")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(e)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(e)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(i)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(i)")`).closest(".missing-info").remove()
                if ($(this).nextAll(".missing-info").find(`span:contains("D(r)")`).length > 0) $(this).nextAll(".missing-info").find(`span:contains("D(r)")`).closest(".missing-info").remove()
                createBar($(this), "D(?)")
                sortBar()
            }
        })
        //O
        $(".active-tab").prevAll(".O-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "O")
                sortBar()
            }
        })
        //C
        $(".active-tab").prevAll(".C-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "C")
                sortBar()
            }
        })
        //L
        $(".active-tab").prevAll(".L-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "L")
                sortBar()
            }
        })
        //B
        $(".active-tab").prevAll(".B-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "B")
                sortBar()
            }
        })
        //G
        $(".active-tab").prevAll(".G-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "G")
                sortBar()
            }
        })
        //Remained Roots
        $(".active-tab").prevAll(".roots-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "ریشه باقیمانده")
                sortBar()
            }
        })

        //Impacted teeth
        $(".active-tab").prevAll(".impacted-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "دندان نهفته")
                sortBar()
            }
        })

        //Periodontal
        $(".active-tab").prevAll(".periodontal-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "پریودنتال")
                sortBar()
            }
        })

        //Periapical
        $(".active-tab").prevAll(".periapical-holder").each(function () {
            if ($(this).is(":checked")) {
                $(this).nextAll(".tooth").css({ "color": "#142dff" })
                createBar($(this), "پری اپیکال")
                sortBar()
            }
        })

        //Missing
        $(".active-tab").prevAll(".tgl").each(function () {
            if ($(this).is(":checked")) {
                $(".tgl:checked").next(".tooth").css("color", "red")
                createBar($(this), "غایب")
                sortBar()
            }
        })
        //remove bar when there is no checked on menu modal form
        let checked_count = 0
        $(".menu-modal .form-check-input").each(function () {
            if ($(this).is(":checked")) {
                checked_count++
            }
        })
        if (checked_count == 0 && $("#Desc").val() == "") {
            $(".active-tab").nextAll(".missing-info").remove()
            $(".active-tab").css({ "color": "black" })
        }
        // change color of comment svg when it has a value
        $(".textarea-comment-holders textarea.form-control").each(function () {
            let name_id = this.id
            let svg = name_id.replace("holder", "svg")
            if ($(this).val().length > 0) {
                $(`#${svg}`).css("fill", "#27ff00")
            } else {
                $(`#${svg}`).css("fill", "#fff")
            }
        })
        $(".tooth").removeClass("active-tab");
    }

    $(".close-menu-modal").on("click", function () {
        generateDatasToShow()
        $(".menu-modal .form-check-input").not("#MissingCheckbox").prop("disabled", false);
        $(".menu-modal").css("display", "none");
    })
    //event for clicking any tooth
    $(".tooth").on("click", function () {
        if ($(".all-link").is(".active")) {                   
            generateDatasToShow()
        }
        //All
        last_selected_tooth = this.id;
        $(this).addClass("active-tab");
        let text_desc = $(this).prevAll(".Desc-holder").val()
        let is_M = $(this).prevAll(".M-holder").is(":checked")
        let is_Me = $(this).prevAll(".M-e-holder").is(":checked")
        let is_Mr = $(this).prevAll(".M-r-holder").is(":checked")
        let is_Mi = $(this).prevAll(".M-i-holder").is(":checked")
        let is_Mq = $(this).prevAll(".M-q-holder").is(":checked")
        let is_D = $(this).prevAll(".D-holder").is(":checked")
        let is_De = $(this).prevAll(".D-e-holder").is(":checked")
        let is_Dr = $(this).prevAll(".D-r-holder").is(":checked")
        let is_Di = $(this).prevAll(".D-i-holder").is(":checked")
        let is_Dq = $(this).prevAll(".D-q-holder").is(":checked")
        let is_O = $(this).prevAll(".O-holder").is(":checked")
        let is_C = $(this).prevAll(".C-holder").is(":checked")
        let is_L = $(this).prevAll(".L-holder").is(":checked")
        let is_B = $(this).prevAll(".B-holder").is(":checked")
        let is_G = $(this).prevAll(".G-holder").is(":checked")
        let is_missing = $(this).prevAll(".tgl").is(":checked")
        let is_periapical = $(this).prevAll(".periapical-holder").is(":checked")
        let is_periodontal = $(this).prevAll(".periodontal-holder").is(":checked")
        let is_impacted = $(this).prevAll(".impacted-holder").is(":checked")
        let is_roots = $(this).prevAll(".roots-holder").is(":checked")
        $("#Desc").val(text_desc)
        $("#M").prop("checked", is_M);
        if (is_M) {
            $(".m-eri-radios").css("display", "flex")
            $(".caries-md-checkboxes > .form-check:first-child").css("margin-right", ".6rem")
        } else {
            $(".m-eri-radios").css("display", "none")
            $(".caries-md-checkboxes > .form-check:first-child").css("margin-right", "5.6rem")
        }
        $("#Me").prop("checked", is_Me);
        $("#Mr").prop("checked", is_Mr);
        $("#Mi").prop("checked", is_Mi);
        $("#Mq").prop("checked", is_Mq);
        $("#D").prop("checked", is_D);
        if (is_D) {
            $(".d-eri-radios").css("display", "flex")
        } else {
            $(".d-eri-radios").css("display", "none")
        }
        $("#De").prop("checked", is_De);
        $("#Dr").prop("checked", is_Dr);
        $("#Di").prop("checked", is_Di);
        $("#Dq").prop("checked", is_Dq);
        $("#O").prop("checked", is_O);
        $("#C").prop("checked", is_C);
        $("#L").prop("checked", is_L);
        $("#B").prop("checked", is_B);
        $("#G").prop("checked", is_G);
        $("#MissingCheckbox").prop("checked", is_missing);
        $("#PeriapicalCheckbox").prop("checked", is_periapical);
        $("#PeriodontalCheckbox").prop("checked", is_periodontal);
        $("#ImpactCheckbox").prop("checked", is_impacted);
        $("#RootsCheckbox").prop("checked", is_roots);
        //All
        if ($(".all-link").is(".active")) {
            $(".menu-modal").css("display", "flex");
            $(".form-check-list , .textarea-container").css("display", "flex")
            $(".caries-md-checkboxes").css("display", "flex")
            $(".oclbg-checkboxes").css("display", "flex")
            $(".textarea-comment-holders").hide()
        }
        //Caries
        if ($(".caries-link").is(".active")) {
            $(".menu-modal").css("display", "flex");
            $(".caries-md-checkboxes , .textarea-container").css("display", "flex")
            $(".oclbg-checkboxes").css("display", "flex")
            $(".textarea-comment-holders ,.form-check-list").hide()
        }
        //Missing
        if ($(".missing-link").is(".active")) {
            if ($(this).nextAll(".missing-info").length == 0) {
                $(this).prevAll(".tgl").prop("checked", true)
                $(this).css("color", "red")
                createBar($(this), "غایب")
                sortBar()
                $(".tooth").not(this).removeClass("active-tab")
            } else {
                $(this).nextAll(".missing-info").remove()
                $(this).prevAll(".tgl").prop("checked", false)
                $(this).css("color", "black")
                $(this).removeClass("active-tab")
            }
        }
        //Periapical
        if ($(".periapical-link").is(".active")) {
            if ($(this).nextAll(".missing-info").length == 0) {
                $(this).prevAll(".periapical-holder").prop("checked", true)
                $(this).css({ "color": "#142dff" })
                createBar($(this), "پری اپیکال")
                sortBar()
                $(".tooth").not(this).removeClass("active-tab")
            } else {
                $(this).nextAll(".missing-info").remove()
                $(this).prevAll(".periapical-holder").prop("checked", false)
                $(this).css("color", "black")
                $(this).removeClass("active-tab")
            }
        }
        //Periodontal
        if ($(".periodontal-link").is(".active")) {
            if ($(this).nextAll(".missing-info").length == 0) {
                $(this).prevAll(".periodontal-holder").prop("checked", true)
                $(this).css({ "color": "#142dff" })
                createBar($(this), "پریودنتال")
                sortBar()
                $(".tooth").not(this).removeClass("active-tab")
            } else {
                $(this).nextAll(".missing-info").remove()
                $(this).prevAll(".periodontal-holder").prop("checked", false)
                $(this).css("color", "black")
                $(this).removeClass("active-tab")
            }
        }
        //Impacted Teeth
        if ($(".impacted-link").is(".active")) {
            if ($(this).nextAll(".missing-info").length == 0) {
                $(this).prevAll(".impacted-holder").prop("checked", true)
                $(this).css({ "color": "#142dff" })
                createBar($(this), "دندان نهفته")
                sortBar()
                $(".tooth").not(this).removeClass("active-tab")
            } else {
                $(this).nextAll(".missing-info").remove()
                $(this).prevAll(".impacted-holder").prop("checked", false)
                $(this).css("color", "black")
                $(this).removeClass("active-tab")
            }
        }
        //Remained Roots
        if ($(".remained-link").is(".active")) {
            if ($(this).nextAll(".missing-info").length == 0) {
                $(this).prevAll(".roots-holder").prop("checked", true)
                $(this).css({ "color": "#142dff" })
                createBar($(this), "ریشه باقیمانده")
                sortBar()
                $(".tooth").not(this).removeClass("active-tab")
            } else {
                $(this).nextAll(".missing-info").remove()
                $(this).prevAll(".roots-holder").prop("checked", false)
                $(this).css("color", "black")
                $(this).removeClass("active-tab")
            }
        }
    })

    //on change every menu modal checkbox
    //Desc
    $("#Desc").on("change", function () {
        if ($(this).val().length > 0) {
            $(".periapical-checkbox .active-tab").prevAll(".Desc-holder").val($(this).val())
        } else {
            $(`#${last_selected_tooth}`).prevAll(".Desc-holder").val("")
        }
    })
    //M
    $("#M").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".M-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".M-holder").prop("checked", false)
            $(`#${last_selected_tooth}`).prevAll(".M-e-holder").prop("checked", false)
            $(`#${last_selected_tooth}`).prevAll(".M-r-holder").prop("checked", false)
            $(`#${last_selected_tooth}`).prevAll(".M-i-holder").prop("checked", false)
            $(`#${last_selected_tooth}`).prevAll(".M-q-holder").prop("checked", false)
            $("#Me").prop("checked", false)
            $("#Mi").prop("checked", false)
            $("#Mr").prop("checked", false)
            $("#Mq").prop("checked", false)
        }
    })
    //Me
    $("#Me").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".M-e-holder").prop("checked", true)
            //$(".periapical-checkbox .active-tab").prevAll(".M-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-r-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-i-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-q-holder").prop("checked", false)
            $("#Mr").prop("checked", false)
            $("#Mi").prop("checked", false)
            $("#Mq").prop("checked", false)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".M-e-holder").prop("checked", false)
        }
    })
    //Mr
    $("#Mr").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".M-r-holder").prop("checked", true)
            //$(".periapical-checkbox .active-tab").prevAll(".M-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-e-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-i-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-q-holder").prop("checked", false)
            $("#Me").prop("checked", false)
            $("#Mi").prop("checked", false)
            $("#Mq").prop("checked", false)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".M-r-holder").prop("checked", false)
        }
    })
    //Mi
    $("#Mi").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".M-i-holder").prop("checked", true)
            //$(".periapical-checkbox .active-tab").prevAll(".M-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-e-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-r-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-q-holder").prop("checked", false)
            $("#Me").prop("checked", false)
            $("#Mr").prop("checked", false)
            $("#Mq").prop("checked", false)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".M-i-holder").prop("checked", false)
        }
    })
    //Mq
    $("#Mq").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".M-q-holder").prop("checked", true)
            //$(".periapical-checkbox .active-tab").prevAll(".M-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-e-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-i-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".M-r-holder").prop("checked", false)
            $("#Me").prop("checked", false)
            $("#Mi").prop("checked", false)
            $("#Mr").prop("checked", false)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".M-q-holder").prop("checked", false)
        }
    })
    //D
    $("#D").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".D-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".D-holder").prop("checked", false)
            $(`#${last_selected_tooth}`).prevAll(".D-e-holder").prop("checked", false)
            $(`#${last_selected_tooth}`).prevAll(".D-r-holder").prop("checked", false)
            $(`#${last_selected_tooth}`).prevAll(".D-i-holder").prop("checked", false)
            $(`#${last_selected_tooth}`).prevAll(".D-q-holder").prop("checked", false)
            $("#De").prop("checked", false)
            $("#Di").prop("checked", false)
            $("#Dr").prop("checked", false)
            $("#Dq").prop("checked", false)
        }
    })
    //De
    $("#De").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".D-e-holder").prop("checked", true)
            //$(".periapical-checkbox .active-tab").prevAll(".D-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-r-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-i-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-q-holder").prop("checked", false)
            $("#Dr").prop("checked", false)
            $("#Di").prop("checked", false)
            $("#Dq").prop("checked", false)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".D-e-holder").prop("checked", false)
        }
    })
    //Dr
    $("#Dr").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".D-r-holder").prop("checked", true)
            //$(".periapical-checkbox .active-tab").prevAll(".D-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-e-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-i-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-q-holder").prop("checked", false)
            $("#De").prop("checked", false)
            $("#Di").prop("checked", false)
            $("#Dq").prop("checked", false)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".D-r-holder").prop("checked", false)
        }
    })
    //Di
    $("#Di").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".D-i-holder").prop("checked", true)
            //$(".periapical-checkbox .active-tab").prevAll(".D-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-r-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-e-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-q-holder").prop("checked", false)
            $("#Dr").prop("checked", false)
            $("#De").prop("checked", false)
            $("#Dq").prop("checked", false)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".D-i-holder").prop("checked", false)
        }
    })
    //Dq
    $("#Dq").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".D-q-holder").prop("checked", true)
            //$(".periapical-checkbox .active-tab").prevAll(".D-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-r-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-i-holder").prop("checked", false)
            $(".periapical-checkbox .active-tab").prevAll(".D-e-holder").prop("checked", false)
            $("#Dr").prop("checked", false)
            $("#Di").prop("checked", false)
            $("#De").prop("checked", false)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".D-q-holder").prop("checked", false)
        }
    })
    //O
    $("#O").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".O-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".O-holder").prop("checked", false)
        }
    })
    //C
    $("#C").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".C-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".C-holder").prop("checked", false)
        }
    })
    //L
    $("#L").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".L-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".L-holder").prop("checked", false)
        }
    })
    //B
    $("#B").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".B-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".B-holder").prop("checked", false)
        }
    })
    //G
    $("#G").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".G-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".G-holder").prop("checked", false)
        }
    })
    //Missing
    $("#MissingCheckbox").on("change", function () {
        if ($(this).is(":checked")) {
            $(".active-tab").prevAll(".tgl").prop("checked", $(this).is(":checked"));
            $(".menu-modal .form-check-input").not("#MissingCheckbox").prop("disabled", true);
        }
        else {
            $(`#${last_selected_tooth}`).prevAll(".tgl").prop("checked", $(this).is(":checked"));
            $(".menu-modal .form-check-input").not("#MissingCheckbox").prop("disabled", false);
        }
    })

    //Periapical
    $("#PeriapicalCheckbox").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".periapical-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".periapical-holder").prop("checked", false)
        }
    })

    //Periodontal
    $("#PeriodontalCheckbox").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".periodontal-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".periodontal-holder").prop("checked", false)
        }
    })

    //impacted Teeth
    $("#ImpactCheckbox").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".impacted-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".impacted-holder").prop("checked", false)
        }
    })
    //remained Roots
    $("#RootsCheckbox").on("change", function () {
        if ($(this).is(":checked")) {
            $(".periapical-checkbox .active-tab").prevAll(".roots-holder").prop("checked", true)
        } else {
            $(`#${last_selected_tooth}`).prevAll(".roots-holder").prop("checked", false)
        }
    })

    //Delete tool button
    $(".delete").on("click", function () {
        kidHeightUp = 20;
        kidHeightDown = 20;
        adultHeightUpLeft = 20;
        adultHeightUpRight = 20;
        adultHeightDownLeft = 20;
        adultHeightDownRight = 20;
        $(".tooth").css("color", "black")
        $(".tooth").removeClass("active-tab")
        $(".missing-info").remove()
        $(".comment-svg").css("fill", "#fff")
        $(".menu-modal").trigger("reset")
        $(".periapical-checkbox input").prop("checked", false)
    })
})

//drag color table
const container = document.querySelector("#teethModal");
const teethTools = document.querySelector("#teethModal .teeth-tools");
function onMouseDrag({ movementX, movementY }) {
    let getContainerStyle = window.getComputedStyle(container);
    let topValue = parseInt(getContainerStyle.top);
    let leftValue = parseInt(getContainerStyle.left);
    if (topValue < 98 && !document.querySelector("#BabyTooth").checked) {
        document.querySelector(".menu-modal").style.top = "235px"
    } else {
        document.querySelector(".menu-modal").style.top = "-152px"
    }
    currentPosition.Top = topValue
    currentPosition.Left = leftValue
    container.style.bottom = "auto"
    container.style.left = `${leftValue + movementX}px`;
    container.style.top = `${topValue + movementY}px`;
}
teethTools.addEventListener("mousedown", () => {
    container.addEventListener("mousemove", onMouseDrag);
});
document.querySelector("#Glass").addEventListener("change", function () {
    if (document.querySelector("#Glass").checked) {
        teethTools.addEventListener("mousedown", () => {
            container.addEventListener("mousemove", onMouseDrag);
        });
    } else {
        container.addEventListener("mousedown", () => {
            container.addEventListener("mousemove", onMouseDrag);
        });
    }
})
document.addEventListener("mouseup", () => {
    container.removeEventListener("mousemove", onMouseDrag);
});
//drag color table in mobile
//// Variables to store initial touch point offset
let offsetX, offsetY;
let isDragging = false;

container.addEventListener("touchstart", (e) => {
    const rect = container.getBoundingClientRect();
    offsetX = e.touches[0].clientX - rect.left;
    offsetY = e.touches[0].clientY - rect.top;
    isDragging = true;
});

container.addEventListener("touchmove", (e) => {
    if (!isDragging) return;

    e.preventDefault();

    const x = e.touches[0].clientX - offsetX + ($(container).outerWidth() / 2);
    const y = e.touches[0].clientY - offsetY;

    container.style.left = x + 'px';
    container.style.top = y + 'px';
    container.style.bottom = 'auto';
});

container.addEventListener("touchend", () => {
    isDragging = false;
});

// Prevent scrolling on touchmove
document.body.addEventListener("touchmove", (e) => {
    e.preventDefault();
}, { passive: false });

/*---افزوده شد ImageViewer جهت رفع باگ پیش آمده در---*/
$("#brightness").on("touchmove", function (event) {
    event.stopPropagation();
})

$("#contrast").on("touchmove", function (event) {
    event.stopPropagation();
})

$(".thumbnail-container").on("touchmove", function (event) {
    event.stopPropagation();
})
/*---افزوده شد ImageViewer جهت رفع باگ پیش آمده در---*/

//--------------------------------------------------------------------
//teeth menu
let tablinks = document.getElementsByClassName("tablinks")
tablinks[0].classList.add("active")
function clickTabHandler(evt) {
    // Declare all variables
    let i, tablinks;

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active")
    }
    // Show the current tab, and add an "active" class to the link that opened the tab
    evt.currentTarget.classList.add("active")
}



//Glass background color checkbox
document.querySelector("#Glass").addEventListener("change", function () {
    if (this.checked) {
        document.querySelector(".teeth-modal-content").style.backgroundColor = "transparent"
    } else {
        document.querySelector(".teeth-modal-content").style.backgroundColor = "#000"
    }
})
//baby tooth checkbox
document.querySelector("#BabyTooth").addEventListener("change", function () {
    if (this.checked) {
        document.querySelector(".periapical-kid").style.display = "block"
    } else {
        document.querySelector(".periapical-kid").style.display = "none"
    }
})
document.querySelector("#M").addEventListener("change", function () {
    if (this.checked) {
        document.querySelector(".m-eri-radios").style.display = "flex"
        document.querySelector(".caries-md-checkboxes .form-check").style.marginRight = ".6rem"
    } else {
        document.querySelector(".m-eri-radios").style.display = "none"
        document.querySelector(".caries-md-checkboxes .form-check").style.marginRight = "5.6rem"
    }
})
document.querySelector("#D").addEventListener("change", function () {
    if (this.checked) {
        document.querySelector(".d-eri-radios").style.display = "flex"
    } else {
        document.querySelector(".d-eri-radios").style.display = "none"
    }
})
// left and right buttons for changing display of teeth
if (window.screen.width < 500) {
    document.querySelector(".right-adult").addEventListener("click", function () {
        document.querySelector(".left-adult").style.color = "#fff"
        document.querySelector(".left-adult").style.borderColor = "#fff"
        document.querySelector(".right-adult").style.color = "#27ff00"
        document.querySelector(".right-adult").style.borderColor = "transparent"
        document.querySelector(".right-adult").style.backgroundColor = "transparent"
        document.querySelector(".periapical-adult .periapical-up-left").style.display = "none"
        document.querySelector(".periapical-adult .periapical-down-left ").style.display = "none"
        document.querySelector(".periapical-adult .periapical-down-right ").style.display = "flex"
        document.querySelector(".periapical-adult .periapical-up-right").style.display = "flex"
    })
    document.querySelector(".left-adult").addEventListener("click", function () {
        document.querySelector(".right-adult").style.color = "#fff"
        document.querySelector(".right-adult").style.borderColor = "#fff"
        document.querySelector(".left-adult").style.color = "#27ff00"
        document.querySelector(".left-adult").style.borderColor = "transparent"
        document.querySelector(".left-adult").style.backgroundColor = "transparent"
        document.querySelector(".periapical-adult .periapical-up-right").style.display = "none"
        document.querySelector(".periapical-adult .periapical-down-right ").style.display = "none"
        document.querySelector(".periapical-adult .periapical-down-left ").style.display = "flex"
        document.querySelector(".periapical-adult .periapical-up-left").style.display = "flex"
    })
    document.querySelector(".right-kid").addEventListener("click", function () {
        document.querySelector(".left-kid").style.color = "#fff"
        document.querySelector(".left-kid").style.borderColor = "#fff"
        document.querySelector(".right-kid").style.color = "#27ff00"
        document.querySelector(".right-kid").style.borderColor = "transparent"
        document.querySelector(".right-kid").style.backgroundColor = "transparent"
        document.querySelector(".periapical-kid .periapical-up-left").style.display = "none"
        document.querySelector(".periapical-kid .periapical-down-left ").style.display = "none"
        document.querySelector(".periapical-kid .periapical-down-right ").style.display = "flex"
        document.querySelector(".periapical-kid .periapical-up-right").style.display = "flex"
    })
    document.querySelector(".left-kid").addEventListener("click", function () {
        document.querySelector(".right-kid").style.color = "#fff"
        document.querySelector(".right-kid").style.borderColor = "#fff"
        document.querySelector(".left-kid").style.color = "#27ff00"
        document.querySelector(".left-kid").style.borderColor = "transparent"
        document.querySelector(".left-kid").style.backgroundColor = "transparent"
        document.querySelector(".periapical-kid .periapical-up-right").style.display = "none"
        document.querySelector(".periapical-kid .periapical-down-right ").style.display = "none"
        document.querySelector(".periapical-kid .periapical-down-left ").style.display = "flex"
        document.querySelector(".periapical-kid .periapical-up-left").style.display = "flex"
    })
}


