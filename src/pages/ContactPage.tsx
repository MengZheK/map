import React from "react";
import { Link } from "react-router-dom";

/**
 * 联系作者占位页（内容由站点自行替换）
 */
export default function ContactPage() {
  return (
    <div className="page contactPage">
      <header className="contactPageHeader">
        <div className="contactPageHeaderInner">
          <Link to="/album" className="contactPageBack">
            返回相册
          </Link>
        </div>
      </header>
      <main className="contactPageMain">
        <h1 className="contactPageTitle">联系作者</h1>
        <p className="contactPageLead">
          感谢您浏览 Hayato Photography 作品。若您希望对拍摄合作、授权使用或展览洽谈进行沟通，欢迎通过预留方式与您对接。
        </p>
        <p className="contactPageP">
          本页为示例占位内容。您可将此处替换为邮箱、社交媒体账号或表单入口；也可接入站内消息与邮件自动回复。
        </p>
        <p className="contactPageP">
          通常我们会在几个工作日内回复。如需紧急联络，请在邮件标题中注明「摄影合作」以便优先处理。
        </p>
      </main>
    </div>
  );
}
