window.$ = require("jquery")
require("bootstrap")
require("popper.js")
const { validate } = require("formee")
window.validate = validate

$(function() {
  $(window).on("scroll", e => {
    // e.
    if ($(this).scrollTop() > 100) {
      $(".navbar").addClass("scrolled-down")
    } else {
      $(".navbar").removeClass("scrolled-down")
    }
  })
  $(window).trigger("scroll")

  window.resetForm = () => {
    $(":input").removeClass("border-danger")

    $(":input")
      .siblings("span.text-danger")
      .remove()
  }
})
