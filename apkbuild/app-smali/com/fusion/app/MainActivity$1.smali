.class Lcom/fusion/app/MainActivity$1;
.super Ljava/lang/Object;
.implements Landroid/view/View$OnClickListener;
.field final synthetic this$0:Lcom/fusion/app/MainActivity;

.method constructor <init>(Lcom/fusion/app/MainActivity;)V
    .locals 0
    iput-object p1, p0, Lcom/fusion/app/MainActivity$1;->this$0:Lcom/fusion/app/MainActivity;
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    return-void
.end method

.method public onClick(Landroid/view/View;)V
    .locals 3
    iget-object v0, p0, Lcom/fusion/app/MainActivity$1;->this$0:Lcom/fusion/app/MainActivity;
    const-string v1, "Fusion 1.7 lista! La app funciona."
    const/4 v2, 0x0
    invoke-static {v0, v1, v2}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;
    move-result-object v0
    invoke-virtual {v0}, Landroid/widget/Toast;->show()V
    return-void
.end method
